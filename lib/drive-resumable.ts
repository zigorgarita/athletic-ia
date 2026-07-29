/**
 * Motor de Cliente para Subida Reanudable a Google Drive via Proxy Servidor
 * Athletic IA / Indautxu 26/27
 *
 * Características:
 * - Chunks de 4 MiB (4,194,304 bytes = múltiplo exacto de 256 KB) para cumplir con el límite seguro de Vercel (< 4.5 MB).
 * - Proxy servidor en /api/google-drive/upload-chunk para evitar restricciones CORS del navegador.
 * - Progreso real por porcentaje y velocidad (MB/s).
 * - Pausa, reanudación y cancelación mediante AbortController.
 */

import { DriveUploadContext } from '@/lib/drive-folders';

export interface UploadProgressInfo {
  status: 'pendiente' | 'subiendo' | 'pausado' | 'completado' | 'fallido' | 'cancelado';
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
  speedMBps: number;
  errorMessage?: string;
  driveFileId?: string;
  videoUrl?: string;
}

export interface DriveResumableUploadOptions {
  file: File;
  passkey: string;
  uploadContext?: DriveUploadContext;
  onProgress?: (info: UploadProgressInfo) => void;
  chunkSizeBytes?: number; // Por defecto 4 MiB (4,194,304 bytes)
}

export class DriveResumableUploader {
  private file: File;
  private passkey: string;
  private uploadContext?: DriveUploadContext;
  private onProgress?: (info: UploadProgressInfo) => void;
  private chunkSize: number;
  
  private uploadUrl: string | null = null;
  private abortController: AbortController | null = null;
  private isPaused = false;
  private isCancelled = false;
  private currentBytesUploaded = 0;
  private startTime = 0;

  constructor(options: DriveResumableUploadOptions) {
    this.file = options.file;
    this.passkey = options.passkey;
    this.uploadContext = options.uploadContext;
    this.onProgress = options.onProgress;
    
    // Límite máximo seguro para Vercel Serverless (4.5 MB body limit) -> 4 MiB (4,194,304 bytes)
    const defaultChunkSize = 4 * 1024 * 1024; // 4,194,304 bytes (16 * 256 KB)
    const baseChunk = options.chunkSizeBytes ? Math.min(options.chunkSizeBytes, defaultChunkSize) : defaultChunkSize;
    // Redondear al múltiplo de 256 KB más cercano
    this.chunkSize = Math.max(256 * 1024, Math.floor(baseChunk / (256 * 1024)) * (256 * 1024));
  }

  /**
   * Inicia o reanuda la subida del archivo.
   */
  public async start(): Promise<UploadProgressInfo> {
    this.isPaused = false;
    this.isCancelled = false;
    this.startTime = Date.now();

    try {
      // 1. Obtener la uploadUrl de sesión reanudable desde nuestro servidor
      if (!this.uploadUrl) {
        this.updateProgress('subiendo', 0);
        
        const sessionRes = await fetch('/api/google-drive/create-resumable-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passkey: this.passkey,
            fileName: this.file.name,
            mimeType: this.file.type || 'video/mp4',
            fileSize: this.file.size,
            uploadContext: this.uploadContext,
          }),
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.uploadUrl) {
          throw new Error(sessionData.error || 'Error al obtener la sesión de subida desde el servidor.');
        }

        // Guardar únicamente en memoria del objeto uploader
        this.uploadUrl = sessionData.uploadUrl;
      }

      // 2. Verificar en Google Drive qué rango de bytes ha recibido ya la sesión
      const resumeByte = await this.queryDriveProgress();
      this.currentBytesUploaded = resumeByte;

      // 3. Subir bloques secuenciales mediante nuestro proxy servidor /api/google-drive/upload-chunk
      const total = this.file.size;

      while (this.currentBytesUploaded < total) {
        if (this.isPaused) {
          return this.updateProgress('pausado', this.currentBytesUploaded);
        }
        if (this.isCancelled) {
          return this.updateProgress('cancelado', this.currentBytesUploaded);
        }

        const startByte = this.currentBytesUploaded;
        const endByte = Math.min(startByte + this.chunkSize - 1, total - 1);
        const chunkBlob = this.file.slice(startByte, endByte + 1);

        this.abortController = new AbortController();

        const response = await fetch('/api/google-drive/upload-chunk', {
          method: 'PUT',
          headers: {
            'x-upload-url': this.uploadUrl!,
            'x-staff-passkey': this.passkey,
            'Content-Range': `bytes ${startByte}-${endByte}/${total}`,
            'Content-Type': this.file.type || 'video/mp4',
          },
          body: chunkBlob,
          signal: this.abortController.signal,
        });

        const resData = await response.json().catch(() => ({}));

        if (!response.ok && resData.error) {
          throw new Error(resData.error);
        }

        if (resData.status === 308 || resData.range) {
          // Bloque recibido parcialmente por Google Drive
          if (resData.range) {
            const match = resData.range.match(/bytes=0-(\d+)/);
            if (match) {
              this.currentBytesUploaded = parseInt(match[1], 10) + 1;
            } else {
              this.currentBytesUploaded = endByte + 1;
            }
          } else {
            this.currentBytesUploaded = endByte + 1;
          }

          this.updateProgress('subiendo', this.currentBytesUploaded);
        } else if (resData.status === 200 || resData.driveFileId || resData.fileData?.id) {
          // Último bloque completado
          const driveFileId = resData.driveFileId || resData.fileData?.id;

          // 4. Finalizar subida y configurar acceso en el servidor
          const finalizeRes = await fetch('/api/google-drive/finalize-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              passkey: this.passkey,
              driveFileId,
              fileName: this.file.name,
              mimeType: this.file.type || 'video/mp4',
              tamanoBytes: this.file.size,
            }),
          });

          const finalizeData = await finalizeRes.json().catch(() => ({}));
          const videoUrl = finalizeData.streamUrl || finalizeData.previewUrl || `https://drive.google.com/file/d/${driveFileId}/preview`;

          this.uploadUrl = null; // Limpiar URL de sesión en memoria
          return this.updateProgress('completado', total, undefined, driveFileId, videoUrl);
        } else {
          throw new Error(resData.error || `Error inesperado durante la transmisión del bloque (HTTP ${response.status}).`);
        }
      }

      return this.updateProgress('completado', total);
    } catch (err: unknown) {
      if (this.isCancelled) {
        return this.updateProgress('cancelado', this.currentBytesUploaded);
      }
      if (this.isPaused) {
        return this.updateProgress('pausado', this.currentBytesUploaded);
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      return this.updateProgress('fallido', this.currentBytesUploaded, errMsg);
    }
  }

  /**
   * Consulta a Google Drive vía proxy servidor para saber cuántos bytes se han recibido.
   */
  public async queryDriveProgress(): Promise<number> {
    if (!this.uploadUrl) return 0;
    try {
      const res = await fetch('/api/google-drive/upload-chunk', {
        method: 'PUT',
        headers: {
          'x-upload-url': this.uploadUrl,
          'x-staff-passkey': this.passkey,
          'Content-Range': `bytes */${this.file.size}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (data.status === 308 && data.range) {
        const match = data.range.match(/bytes=0-(\d+)/);
        if (match) {
          return parseInt(match[1], 10) + 1;
        }
      } else if (data.status === 200) {
        return this.file.size;
      }
    } catch (err) {
      console.warn('[DriveResumableUploader] Error al consultar progreso a Drive:', err);
    }
    return 0;
  }

  /**
   * Pausa la subida actual.
   */
  public pause() {
    this.isPaused = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.updateProgress('pausado', this.currentBytesUploaded);
  }

  /**
   * Cancela la subida activa y limpia la sesión.
   */
  public async cancel() {
    this.isCancelled = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.uploadUrl = null;
    this.updateProgress('cancelado', this.currentBytesUploaded);
  }

  /**
   * Helper interno para emitir el progreso.
   */
  private updateProgress(
    status: UploadProgressInfo['status'],
    bytesUploaded: number,
    errorMessage?: string,
    driveFileId?: string,
    videoUrl?: string
  ): UploadProgressInfo {
    const totalBytes = this.file.size || 1;
    const percent = Math.min(100, Math.round((bytesUploaded / totalBytes) * 100));
    
    const elapsedTimeSec = Math.max(0.1, (Date.now() - this.startTime) / 1000);
    const speedMBps = parseFloat(((bytesUploaded / (1024 * 1024)) / elapsedTimeSec).toFixed(2));

    const info: UploadProgressInfo = {
      status,
      bytesUploaded,
      totalBytes,
      percent,
      speedMBps,
      errorMessage,
      driveFileId,
      videoUrl,
    };

    if (this.onProgress) {
      this.onProgress(info);
    }

    return info;
  }
}
