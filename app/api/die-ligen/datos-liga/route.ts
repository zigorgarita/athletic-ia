import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigueDatosLiga, getDieLigueRivalData } from '@/lib/die-ligen/datos-liga';

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

    // 2. Comprobar si se solicitan datos de un rival concreto
    const { searchParams } = new URL(req.url);
    const rivalName = searchParams.get('rival')?.trim();

    if (rivalName) {
      const rivalData = await getDieLigueRivalData(rivalName);
      return NextResponse.json({
        success: true,
        data: rivalData,
      });
    }

    // 3. Obtener conjunto completo de Datos Indautxu · Die Ligue
    const data = await getDieLigueDatosLiga();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno consultando Die Ligue';
    console.error('Error en /api/die-ligen/datos-liga:', err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
