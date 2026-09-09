import { NextResponse } from 'next/server';
import { createSignedCoachSessionToken, COACH_SESSION_COOKIE_NAME } from '@/lib/auth/staff-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passkey } = body || {};

    if (!passkey || typeof passkey !== 'string' || passkey.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Clave de acceso requerida' },
        { status: 400 }
      );
    }

    const expectedPasskey = process.env.COACH_STAFF_PASSKEY?.trim();

    // Fallar cerrado si la variable no está configurada en el servidor
    if (!expectedPasskey || expectedPasskey.length === 0) {
      console.error('[AUTH] COACH_STAFF_PASSKEY no está configurada en el servidor.');
      return NextResponse.json(
        { success: false, error: 'Servicio de autenticación no configurado' },
        { status: 500 }
      );
    }

    const inputPasskey = passkey.trim();

    if (inputPasskey !== expectedPasskey) {
      return NextResponse.json(
        { success: false, error: 'Contraseña de acceso incorrecta' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    const sessionToken = createSignedCoachSessionToken();
    response.cookies.set({
      name: COACH_SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error interno en el servidor de autenticación' },
      { status: 500 }
    );
  }
}
