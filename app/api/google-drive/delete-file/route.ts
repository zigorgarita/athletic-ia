import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { getGoogleDriveAccessToken } from '@/lib/google-drive';

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación de staff mediante sesión central
    const authorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(request);
    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado: Se requiere sesión de cuerpo técnico.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { driveFileId } = body;

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
