import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenTimelineForJornada } from '@/lib/die-ligen/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verificación de autorización de staff (patrón existente de la app)
    const staffPasskey = req.headers.get('x-staff-passkey')?.trim() || req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (process.env.COACH_STAFF_PASSKEY || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026').trim();

    let isAuthorized = Boolean(staffPasskey && staffPasskey === expectedPasskey);

    // Si no coincide la passkey directa de staff, permitir también verificación de sesión/editor si estuviera disponible
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
    const jornadaStr = searchParams.get('jornada');

    if (!jornadaStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'El parámetro "jornada" es obligatorio.',
        },
        { status: 400 }
      );
    }

    const jornada = parseInt(jornadaStr, 10);
    if (isNaN(jornada) || jornada < 1 || jornada > 38) {
      return NextResponse.json(
        {
          success: false,
          error: `Número de jornada inválido (${jornadaStr}).`,
        },
        { status: 400 }
      );
    }

    // 3. Resolución dinámica del partido en Die Ligen y obtención de eventos
    const result = await getDieLigenTimelineForJornada(jornada);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado al consultar línea temporal de Die Ligen.';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
