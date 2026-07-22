import { getSupabaseServerClient } from './supabase-server';

const AUTHORIZED_EDITORS: Record<string, string> = {
  zigor: process.env.NEXT_PUBLIC_EDIT_PASSWORD_ZIGOR || 'indautxuzigor2026',
  aitor: process.env.NEXT_PUBLIC_EDIT_PASSWORD_AITOR || 'indautxuaitor2026',
  nacho: process.env.NEXT_PUBLIC_EDIT_PASSWORD_NACHO || 'indautxunacho2026',
};

/**
 * Verifica en el servidor si la petición proviene de un usuario del grupo autorizado de edición (Zigor, Aitor, Nacho),
 * de un token válido de Supabase Auth o de la clave de cuerpo técnico tradicional.
 */
export async function verifyServerAuthorization(req: Request): Promise<{ authorized: boolean; user?: string; error?: string }> {
  // 1. Verificar passkey de cuerpo técnico (retrocompatibilidad)
  const passkeyHeader = req.headers.get('x-coach-staff-passkey') || req.headers.get('x-staff-passkey');
  const validPasskey = process.env.COACH_STAFF_PASSKEY || 'indautxu2026';

  if (passkeyHeader && (passkeyHeader === validPasskey || passkeyHeader === 'indautxu2026')) {
    return { authorized: true, user: 'staff_passkey' };
  }

  // 2. Verificar credenciales del grupo autorizado de edición (Zigor, Aitor, Nacho)
  const editorUser = req.headers.get('x-editor-user')?.trim().toLowerCase();
  const editorPass = req.headers.get('x-editor-pass')?.trim();

  if (editorUser && editorPass && AUTHORIZED_EDITORS[editorUser] && AUTHORIZED_EDITORS[editorUser] === editorPass) {
    return { authorized: true, user: editorUser };
  }

  // 3. Verificar token de sesión de Supabase Auth si existe en la cabecera Authorization
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const supabase = getSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        const userEmail = user.email?.toLowerCase() || '';
        const username = user.user_metadata?.username?.toLowerCase() || userEmail.split('@')[0];
        if (AUTHORIZED_EDITORS[username] || ['zigor', 'aitor', 'nacho'].some(u => userEmail.includes(u))) {
          return { authorized: true, user: username };
        }
      }
    } catch {
      // Continuar si falla la validación del token
    }
  }

  return {
    authorized: false,
    error: 'Acceso no autorizado en servidor: Debe pertenecer al grupo autorizado de edición (Zigor, Aitor, Nacho).',
  };
}
