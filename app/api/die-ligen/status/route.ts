import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenStatus } from '@/lib/die-ligen/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verificación de autorización de staff/editor en servidor
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          connected: false,
          errorCode: 'APP_AUTH_UNAUTHORIZED',
          temporadaActual: null,
          competiciones: [],
          error: authCheck.error || 'Acceso no autorizado en la aplicación (APP_AUTH_UNAUTHORIZED).',
        },
        { status: 401 }
      );
    }

    // 2. Consulta de estado y suscripciones al cliente seguro de Die Ligen
    const status = await getDieLigenStatus();

    return NextResponse.json(status);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado al consultar estado de Die Ligen.';
    return NextResponse.json(
      {
        connected: false,
        errorCode: 'DIE_LIGEN_UPSTREAM_ERROR',
        temporadaActual: null,
        competiciones: [],
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
