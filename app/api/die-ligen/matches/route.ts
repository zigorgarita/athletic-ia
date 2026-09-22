import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenMatchesForTeam } from '@/lib/die-ligen/client';

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

    // 2. Extraer parámetros del club
    const { searchParams } = new URL(req.url);
    const clubName = searchParams.get('clubName')?.trim();
    const shortName = searchParams.get('shortName')?.trim() || null;
    const contestId = searchParams.get('contestId')?.trim() || undefined;

    if (!clubName) {
      return NextResponse.json(
        {
          success: false,
          error: 'El parámetro "clubName" es obligatorio para consultar partidos en Die Ligen.',
        },
        { status: 400 }
      );
    }

    // 3. Obtener partidos del rival en Die Ligen
    const matches = await getDieLigenMatchesForTeam({
      clubName,
      shortName,
      contestId,
    });

    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
      analyzedTotal: matches.filter((m) => m.isAnalyzed).length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado al consultar partidos en Die Ligen.';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
