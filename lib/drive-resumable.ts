/**
 * Motor de Cliente para Subida Reanudable a Google Drive (Resumable Upload API)
 * Athletic IA / Indautxu 26/27
 *
 * Características:
 * - Chunks de 8 MB (múltiplos exactos de 256 KB = 262,144 bytes).
 * - Progreso real por porcentaje y cálculo de velocidad (MB/s).
 * - Consulta de estado real a Google Drive (PUT bytes con cabecera Range).
 * - Pausa, reanudación y cancelación limpia mediante AbortController.
 * - Sin almacenamiento persistente de uploadUrl (solo en memoria durante la subida).
 */

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
  onProgress?: (info: UploadProgressInfo) => void;
  chunkSizeBytes?: number; // Por defecto 8 MB (8,388,608 bytes)
}

export class DriveResumableUploader {
  private file: File;
  private passkey: string;
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
    this.onProgress = options.onProgress;
    
    // Asignar tamaño de chunk (múltiplo de 256 KB). Por defecto 8 MB
    const defaultChunkSize = 8 * 1024 * 1024; // 8,388,608 bytes
    const baseChunk = options.chunkSizeBytes || defaultChunkSize;
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
          }),
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.uploadUrl) {
          throw new Error(sessionData.error || 'Error al obtener la sesión de subida desde el servidor.');
        }

        // Guardar únicamente en memoria del objeto uploader (nunca en localStorage, logs ni Supabase)
        this.uploadUrl = sessionData.uploadUrl;
      }

      // 2. Verificar en Google Drive qué rango de bytes ha recibido ya la sesión
      const resumeByte = await this.queryDriveProgress();
      this.currentBytesUploaded = resumeByte;

      // 3. Subir bloques secuenciales
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

        const response = await fetch(this.uploadUrl!, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${startByte}-${endByte}/${total}`,
            'Content-Type': this.file.type || 'video/mp4',
          },
          body: chunkBlob,
          signal: this.abortController.signal,
        });

        if (response.status === 308) {
          // Bloque recibido parcialmente, actualizar puntero
          const rangeHeader = response.headers.get('range');
          if (rangeHeader) {
            const match = rangeHeader.match(/bytes=0-(\d+)/);
            if (match) {
              this.currentBytesUploaded = parseInt(match[1], 10) + 1;
            } else {
              this.currentBytesUploaded = endByte + 1;
            }
          } else {
            this.currentBytesUploaded = endByte + 1;
          }

          this.updateProgress('subiendo', this.currentBytesUploaded);
        } else if (response.ok || response.status === 200 || response.status === 201) {
          // Último bloque completado
          const finalData = await response.json().catch(() => ({}));
          const driveFileId = finalData.id;

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
          const errText = await response.text();
          throw new Error(`Error de Google Drive (HTTP ${response.status}): ${errText}`);
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
   * Consulta a Google Drive mediante PUT bytes con cabecera Content-Range para saber exactamente cuántos bytes se han recibido.
   */
  public async queryDriveProgress(): Promise<number> {
    if (!this.uploadUrl) return 0;
    try {
      const res = await fetch(this.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes */${this.file.size}`,
        },
      });

      if (res.status === 308) {
        const rangeHeader = res.headers.get('range');
        if (rangeHeader) {
          const match = rangeHeader.match(/bytes=0-(\d+)/);
          if (match) {
            return parseInt(match[1], 10) + 1;
          }
        }
      } else if (res.status === 200 || res.status === 201) {
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
    
    this.uploadUrl = null; // Limpiar URL de memoria
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
