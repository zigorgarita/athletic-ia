import { NextResponse } from 'next/server';
import { createSignedSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, pass } = body || {};

    if (!username || !pass) {
      return NextResponse.json(
        { success: false, error: 'Usuario y contraseña requeridos' },
        { status: 400 }
      );
    }

    const userLower = String(username).trim().toLowerCase();
    const userPass = String(pass).trim();

    // Servidor: obtener contraseñas exclusivamente desde variables privadas de servidor
    const serverPasswords: Record<string, string | undefined> = {
      zigor: process.env.EDIT_PASSWORD_ZIGOR,
      aitor: process.env.EDIT_PASSWORD_AITOR,
      nacho: process.env.EDIT_PASSWORD_NACHO,
      julen: process.env.EDIT_PASSWORD_JULEN,
    };

    const roles: Record<string, { name: string; role: 'editor' }> = {
      zigor: { name: 'Zigor', role: 'editor' },
      aitor: { name: 'Aitor', role: 'editor' },
      nacho: { name: 'Nacho', role: 'editor' },
      julen: { name: 'Julen', role: 'editor' },
    };

    const expectedPass = serverPasswords[userLower]?.trim();
    const userInfo = roles[userLower];

    if (!userInfo || !expectedPass || userPass !== expectedPass) {
      return NextResponse.json(
        { success: false, error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const token = createSignedSessionToken({
      userId: userLower,
      name: userInfo.name,
      role: userInfo.role,
    });

    const response = NextResponse.json({
      success: true,
      profile: {
        id: userLower,
        name: userInfo.name,
        role: userInfo.role,
        canEdit: true,
      },
    });

    // Set HttpOnly, Secure cookie
    response.cookies.set({
      name: 'staff_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutos
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error interno en el servidor de autenticación' },
      { status: 500 }
    );
  }
}
