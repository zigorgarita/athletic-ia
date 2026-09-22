import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigueJornadaActas } from '@/lib/die-ligen/actas';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verificación de autorización de staff (patrón oficial de la app)
    const staffPasskey =
      req.headers.get('x-staff-passkey')?.trim() ||
      req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (
      process.env.COACH_STAFF_PASSKEY ||
      process.env.NEXT_PUBLIC_COACH_PASSKEY ||
      'indautxu2026'
    ).trim();

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

    // 2. Extraer y validar el parámetro de jornada
    const { searchParams } = new URL(req.url);
    const jornadaStr = searchParams.get('jornada') || '3';

    const jornada = parseInt(jornadaStr, 10);
    if (isNaN(jornada) || jornada < 1 || jornada > 38) {
      return NextResponse.json(
        {
          success: false,
          error: `Número de jornada inválido (${jornadaStr}). Debe estar entre 1 y 38.`,
        },
        { status: 400 }
      );
    }

    // 3. Consultar los 8 partidos de la jornada en Die Ligue
    const data = await getDieLigueJornadaActas(jornada);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno consultando Die Ligue';
    console.error('Error en /api/die-ligen/jornada:', err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
