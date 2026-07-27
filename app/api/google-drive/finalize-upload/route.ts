import { NextResponse } from 'next/server';
import { getGoogleDriveAccessToken } from '@/lib/google-drive';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passkey, driveFileId, fileName, mimeType, tamanoBytes } = body;

    const validPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';
    if (!passkey || passkey !== validPasskey) {
      return NextResponse.json(
        { error: 'No autorizado. Clave de staff inválida.' },
        { status: 401 }
      );
    }

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
