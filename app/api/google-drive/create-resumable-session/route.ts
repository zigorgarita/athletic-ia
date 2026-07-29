import { NextResponse } from 'next/server';
import { getGoogleDriveAccessToken } from '@/lib/google-drive';
import { getOrCreateDriveFolderPath, DriveUploadContext } from '@/lib/drive-folders';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passkey, fileName, mimeType, fileSize, uploadContext } = body as {
      passkey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      uploadContext?: DriveUploadContext;
    };

    // 1. Validar autenticación de staff del lado servidor
    const validPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';
    if (!passkey || passkey !== validPasskey) {
      return NextResponse.json(
        { error: 'No autorizado. Clave de staff inválida.' },
        { status: 401 }
      );
    }

    // 2. Validar parámetros de entrada
    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (fileName, mimeType, fileSize).' },
        { status: 400 }
      );
    }

    const cleanFileName = String(fileName).replace(/[^\w\s.-]/gi, '_');
    const MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
    if (fileSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El tamaño del archivo excede el límite máximo permitido (5 GB).' },
        { status: 400 }
      );
    }

    // 3. Resolver la carpeta de destino en Drive (dinámica por contexto o fallback a la carpeta raíz)
    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (uploadContext && uploadContext.module) {
      folderId = await getOrCreateDriveFolderPath(uploadContext);
    }

    // 4. Solicitar Access Token fresco a Google Drive
    const accessToken = await getGoogleDriveAccessToken();

    // 5. Solicitar URL de Sesión Reanudable a Google Drive API v3
    const metadata: Record<string, unknown> = {
      name: cleanFileName,
      mimeType: mimeType || 'video/mp4',
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Upload-Content-Type': mimeType || 'video/mp4',
          'X-Upload-Content-Length': String(fileSize),
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return NextResponse.json(
        { error: `Error al iniciar sesión en Google Drive (HTTP ${driveRes.status}): ${errText}` },
        { status: 500 }
      );
    }

    const uploadUrl = driveRes.headers.get('location');
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Google Drive no devolvió la cabecera Location de la sesión reanudable.' },
        { status: 500 }
      );
    }

    // Retornar únicamente la uploadUrl temporal al cliente autorizado (sin exponer tokens ni guardar en DB)
    return NextResponse.json({
      success: true,
      uploadUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
