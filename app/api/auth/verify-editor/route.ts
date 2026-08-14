import { NextResponse } from 'next/server';

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

    // Servidor: obtener contraseñas desde variables de entorno de servidor privadas
    const serverPasswords: Record<string, string | undefined> = {
      zigor: process.env.EDIT_PASSWORD_ZIGOR,
      aitor: process.env.EDIT_PASSWORD_AITOR,
      nacho: process.env.EDIT_PASSWORD_NACHO,
      julen: process.env.EDIT_PASSWORD_JULEN,
    };

    const roles: Record<string, { name: string; role: 'admin' | 'editor' }> = {
      zigor: { name: 'Zigor', role: 'admin' },
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

    return NextResponse.json({
      success: true,
      profile: {
        id: userLower,
        name: userInfo.name,
        role: userInfo.role,
        canEdit: true,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error interno en el servidor de autenticación' },
      { status: 500 }
    );
  }
}
