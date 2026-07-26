/**
 * Módulo de integración de servidor para Google Drive (5 TB Almacenamiento Privado).
 * Utiliza variables de entorno seguras (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN).
 */

export interface DriveUploadResult {
  driveFileId: string;
  url: string;
  embedUrl: string;
  name: string;
}

/**
 * Solicita un Access Token fresco utilizando el Refresh Token de la cuenta de Google Drive de 5 TB.
 */
export async function getGoogleDriveAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Las variables de entorno de Google Drive (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN) no están configuradas en .env.local.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Error al autenticar con Google Drive: ${errorData.error_description || res.statusText}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Sube un buffer de vídeo a la carpeta de Google Drive configurada.
 */
export async function uploadVideoBufferToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
  const accessToken = await getGoogleDriveAccessToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. Metadata del archivo en Drive
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: mimeType || 'video/mp4',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'video/mp4'}\r\n\r\n`
    ),
    buffer,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Error al subir el archivo a Google Drive (HTTP ${uploadRes.status}): ${errText}`);
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id as string;

  return {
    driveFileId: fileId,
    url: `https://drive.google.com/file/d/${fileId}/view`,
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    name: fileName,
  };
}
