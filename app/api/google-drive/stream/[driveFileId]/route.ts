import { getGoogleDriveAccessToken } from '@/lib/google-drive';

export async function GET(
  request: Request,
  { params }: { params: { driveFileId: string } }
) {
  try {
    const { driveFileId } = params;

    if (!driveFileId) {
      return new Response('driveFileId no especificado', { status: 400 });
    }

    // Validar autorización de sesión/passkey si viene por cabecera o query string
    const urlObj = new URL(request.url);
    const queryPasskey = urlObj.searchParams.get('passkey');
    const headerPasskey = request.headers.get('x-staff-passkey');
    const passkey = queryPasskey || headerPasskey;
    const validPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';

    if (passkey && passkey !== validPasskey) {
      return new Response('Acceso no autorizado al vídeo privado', { status: 401 });
    }

    const accessToken = await getGoogleDriveAccessToken();

    // Reenviar cabecera Range del navegador si existe (para sopotamiento de seeking/replay HTTP 206)
    const rangeHeader = request.headers.get('range');
    const driveHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (rangeHeader) {
      driveHeaders['Range'] = rangeHeader;
    }

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media`,
      {
        method: 'GET',
        headers: driveHeaders,
      }
    );

    if (!driveRes.ok && driveRes.status !== 206) {
      const errText = await driveRes.text();
      return new Response(`Error al obtener stream de Google Drive (HTTP ${driveRes.status}): ${errText}`, {
        status: driveRes.status,
      });
    }

    // Transmitir cabeceras HTTP de streaming
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', driveRes.headers.get('Content-Type') || 'video/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');

    if (driveRes.headers.get('Content-Range')) {
      responseHeaders.set('Content-Range', driveRes.headers.get('Content-Range')!);
    }
    if (driveRes.headers.get('Content-Length')) {
      responseHeaders.set('Content-Length', driveRes.headers.get('Content-Length')!);
    }

    return new Response(driveRes.body, {
      status: driveRes.status, // HTTP 206 Partial Content si fue petición Range, o 200 OK
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(`Error interno de streaming: ${msg}`, { status: 500 });
  }
}
