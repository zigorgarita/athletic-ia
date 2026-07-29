import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    // 1. Validar autenticación de staff
    const headerPasskey = request.headers.get('x-staff-passkey');
    const validPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';

    if (!headerPasskey || headerPasskey !== validPasskey) {
      return NextResponse.json(
        { error: 'No autorizado. Clave de staff inválida.' },
        { status: 401 }
      );
    }

    // 2. Obtener URL de destino de Google Drive
    const uploadUrl = request.headers.get('x-upload-url');
    if (!uploadUrl || !uploadUrl.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
      return NextResponse.json(
        { error: 'URL de sesión de Google Drive no especificada o inválida.' },
        { status: 400 }
      );
    }

    // 3. Obtener cabeceras de rango y tipo de contenido
    const contentRange = request.headers.get('content-range');
    const contentType = request.headers.get('content-type') || 'video/mp4';

    if (!contentRange) {
      return NextResponse.json(
        { error: 'Cabecera Content-Range no especificada.' },
        { status: 400 }
      );
    }

    // 4. Leer buffer binario del chunk
    const arrayBuffer = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    // Límite de seguridad estricto de Vercel Serverless (4.5 MB máximo de payload)
    const MAX_CHUNK_LIMIT = 4.3 * 1024 * 1024; // ~4.51 MB
    if (chunkBuffer.length > MAX_CHUNK_LIMIT) {
      return NextResponse.json(
        { error: `El bloque (${(chunkBuffer.length / (1024 * 1024)).toFixed(2)} MB) excede el límite seguro de Vercel (4.5 MB).` },
        { status: 400 }
      );
    }

    // 5. Configurar cabeceras para enviarlas servidor-a-servidor a Google Drive
    const googleHeaders: Record<string, string> = {
      'Content-Range': contentRange,
      'Content-Type': contentType,
    };

    if (chunkBuffer.length > 0) {
      googleHeaders['Content-Length'] = String(chunkBuffer.length);
    }

    // 6. Reexpedir petición PUT a Google Drive
    const driveRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: googleHeaders,
      body: chunkBuffer.length > 0 ? chunkBuffer : undefined,
    });

    // 7. Procesar respuesta de Google Drive
    if (driveRes.status === 308) {
      // Bloque parcial recibido por Google Drive
      const rangeHeader = driveRes.headers.get('range');
      return NextResponse.json({
        success: true,
        status: 308,
        range: rangeHeader,
      });
    }

    if (driveRes.ok || driveRes.status === 200 || driveRes.status === 201) {
      // Último bloque recibido y archivo completado en Google Drive
      const fileData = await driveRes.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        status: 200,
        driveFileId: fileData.id,
        fileData,
      });
    }

    // Si Google devuelve error (ej. 4xx o 5xx)
    const errText = await driveRes.text();
    return NextResponse.json(
      { error: `Error de Google Drive (HTTP ${driveRes.status}): ${errText}` },
      { status: driveRes.status >= 400 && driveRes.status < 600 ? driveRes.status : 500 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
