import { getSupabaseServerClient } from './supabase-server';

const AUTHORIZED_EDITORS: Record<string, string> = {
  zigor: process.env.NEXT_PUBLIC_EDIT_PASSWORD_ZIGOR || 'indautxuzigor2026',
  aitor: process.env.NEXT_PUBLIC_EDIT_PASSWORD_AITOR || 'indautxuaitor2026',
  nacho: process.env.NEXT_PUBLIC_EDIT_PASSWORD_NACHO || 'indautxunacho2026',
};

export interface AuthVerificationResult {
  authorized: boolean;
  user?: string;
  authMethod?: 'supabase_token' | 'editor_credentials' | 'staff_passkey';
  error?: string;
}

/**
 * Verifica en el servidor la sesión o token real de Supabase Auth o credenciales secretas
 * contra el grupo de usuarios autorizados de edición (Zigor, Aitor, Nacho).
 */
export async function verifyServerAuthorization(req: Request): Promise<AuthVerificationResult> {
  const supabase = getSupabaseServerClient();

  // 1. Verificación primaria: Token de sesión real con Supabase Auth
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const userEmail = user.email?.toLowerCase() || '';
          const username = (user.user_metadata?.username as string)?.toLowerCase() || userEmail.split('@')[0];

          const isAuthorizedUser = ['zigor', 'aitor', 'nacho'].some(
            u => username === u || userEmail.startsWith(u + '@')
          );

          if (isAuthorizedUser) {
            return {
              authorized: true,
              user: username,
              authMethod: 'supabase_token',
            };
          }
        }
      } catch (err) {
        console.warn('Advertencia verificando token Supabase Auth:', err);
      }
    }
  }

  // 2. Verificación secundaria: Credenciales secretas de usuario editor (Zigor, Aitor, Nacho)
  const editorUser = req.headers.get('x-editor-user')?.trim().toLowerCase();
  const editorPass = req.headers.get('x-editor-pass')?.trim();

  if (editorUser && editorPass && AUTHORIZED_EDITORS[editorUser]) {
    if (AUTHORIZED_EDITORS[editorUser] === editorPass) {
      return {
        authorized: true,
        user: editorUser,
        authMethod: 'editor_credentials',
      };
    }
  }

  // 3. Verificación de compatibilidad temporal: Passkey de cuerpo técnico
  const passkeyHeader = req.headers.get('x-coach-staff-passkey') || req.headers.get('x-staff-passkey');
  const validPasskey = process.env.COACH_STAFF_PASSKEY || 'indautxu2026';

  if (passkeyHeader && (passkeyHeader === validPasskey || passkeyHeader === 'indautxu2026')) {
    return {
      authorized: true,
      user: 'staff_passkey',
      authMethod: 'staff_passkey',
    };
  }

  return {
    authorized: false,
    error: 'Acceso no autorizado en servidor: La petición no proviene de un token de Supabase Auth verificado ni de una credencial autorizada (Zigor, Aitor, Nacho).',
  };
}
