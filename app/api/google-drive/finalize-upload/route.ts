import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación mediante sesión central o credenciales de editor
    const authCheck = await verifyServerAuthorization(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'No autorizado: Se requiere sesión de cuerpo técnico o credenciales de editor válidas.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { driveFileId, fileName, mimeType, tamanoBytes } = body;

    if (!driveFileId || typeof driveFileId !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere un driveFileId válido.' },
        { status: 400 }
      );
    }

    // Por defecto se mantiene privacidad estricta. El streaming autenticado
    // se realiza vía /api/google-drive/stream/[driveFileId].
    const previewUrl = `https://drive.google.com/file/d/${driveFileId}/preview`;
    const streamUrl = `/api/google-drive/stream/${driveFileId}`;

    return NextResponse.json({
      success: true,
      driveFileId,
      fileName,
      mimeType,
      tamanoBytes,
      previewUrl,
      streamUrl,
      videoUrl: streamUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
