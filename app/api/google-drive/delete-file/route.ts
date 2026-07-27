import { NextResponse } from 'next/server';
import { getGoogleDriveAccessToken } from '@/lib/google-drive';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passkey, driveFileId } = body;

    const validPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || process.env.COACH_STAFF_PASSKEY || 'indautxu2026';
    if (!passkey || passkey !== validPasskey) {
      return NextResponse.json(
        { error: 'No autorizado. Clave de staff inválida.' },
        { status: 401 }
      );
    }

    if (!driveFileId || typeof driveFileId !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere un driveFileId válido para eliminar.' },
        { status: 400 }
      );
    }

    const accessToken = await getGoogleDriveAccessToken();

    const deleteRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteRes.ok && deleteRes.status !== 204) {
      const errText = await deleteRes.text();
      return NextResponse.json(
        { error: `Error al eliminar archivo en Google Drive (HTTP ${deleteRes.status}): ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedDriveFileId: driveFileId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
