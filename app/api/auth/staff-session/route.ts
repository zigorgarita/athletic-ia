import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized } from '@/lib/auth/staff-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de comprobación de sesión server-side para el staff general.
 * Solo responde authorized: true/false.
 * NUNCA devuelve tokens, firmas, passkeys ni secretos.
 */
export async function GET() {
  try {
    const authorized = await isCoachSessionAuthorized();

    return NextResponse.json(
      { authorized },
      { status: authorized ? 200 : 401 }
    );
  } catch {
    return NextResponse.json(
      { authorized: false },
      { status: 401 }
    );
  }
}
