import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenGameRawJson } from '@/lib/die-ligen/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verificación de autorización de staff/editor (estándar de la aplicación)
    const staffPasskey = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();

    let isAuthorized = Boolean(staffPasskey && staffPasskey === expectedPasskey);

    if (!isAuthorized) {
      const authCheck = await verifyServerAuthorization(req);
      isAuthorized = authCheck.authorized;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Acceso no autorizado en la aplicación. Clave de staff no válida.',
        },
        { status: 401 }
      );
    }

    // 2. Extraer parámetro gameId
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId')?.trim();

    if (!gameId) {
      return NextResponse.json(
        {
          success: false,
          error: 'El parámetro "gameId" es obligatorio para obtener el análisis del partido.',
        },
        { status: 400 }
      );
    }

    // 3. Descargar el documento JSON original completo sin transformaciones
    const rawJson = await getDieLigenGameRawJson(gameId);

    return NextResponse.json({
      success: true,
      data: rawJson,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado al descargar análisis de Die Ligen.';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
