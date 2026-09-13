import { getSupabaseServerClient } from './supabase-server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from './auth/staff-session';

export interface AuthVerificationResult {
  authorized: boolean;
  user?: string;
  authMethod: 'supabase_token' | 'editor_credentials' | 'staff_session' | 'unauthorized';
  error?: string;
}

/**
 * Módulo de verificación de autorización exclusivo del servidor para rutas de Rivales y Táctica.
 * NUNCA asume identidades por defecto si faltan credenciales ni utiliza passkeys antiguas.
 * Autoriza exclusivamente mediante:
 * 1. Sesión central de staff (cookie firmada HMAC-SHA256).
 * 2. Token JWT verificado de Supabase Auth.
 * 3. Credenciales privadas de editor (x-editor-user y x-editor-pass).
 */
export async function verifyServerAuthorization(req: Request): Promise<AuthVerificationResult> {
  // 1. Verificación mediante sesión central de staff (cookie coach_staff_session o staff_session editor/admin)
  const isStaffAuthorized = (await isCoachSessionAuthorized()) || isCoachSessionAuthorizedFromRequest(req);
  if (isStaffAuthorized) {
    return {
      authorized: true,
      user: 'coach_staff',
      authMethod: 'staff_session',
    };
  }

  // 2. Verificación por Token JWT de Supabase Auth
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const userEmail = user.email?.toLowerCase().trim() || '';
          
          // Lista de emails autorizados exactos desde variables del servidor
          const allowedEmails = [
            process.env.AUTHORIZED_EMAIL_ZIGOR?.toLowerCase().trim(),
            process.env.AUTHORIZED_EMAIL_AITOR?.toLowerCase().trim(),
            process.env.AUTHORIZED_EMAIL_NACHO?.toLowerCase().trim(),
            process.env.AUTHORIZED_EMAIL_JULEN?.toLowerCase().trim(),
          ].filter((email): email is string => Boolean(email));

          const isAuthorized = allowedEmails.length > 0 ? allowedEmails.includes(userEmail) : Boolean(userEmail);

          if (isAuthorized) {
            return {
              authorized: true,
              user: userEmail,
              authMethod: 'supabase_token',
            };
          }
        }
      } catch (err) {
        console.warn('[AUTH] Error verificando token Supabase Auth:', err);
      }
    }
  }

  // 3. Verificación por credenciales explícitas de usuario editor mediante variables de servidor privadas
  const editorUser = req.headers.get('x-editor-user')?.trim().toLowerCase();
  const editorPass = req.headers.get('x-editor-pass')?.trim();

  const serverPasswords: Record<string, string | undefined> = {
    zigor: process.env.EDIT_PASSWORD_ZIGOR,
    aitor: process.env.EDIT_PASSWORD_AITOR,
    nacho: process.env.EDIT_PASSWORD_NACHO,
    julen: process.env.EDIT_PASSWORD_JULEN,
  };

  if (editorUser && editorPass && serverPasswords[editorUser]) {
    const validServerPass = serverPasswords[editorUser]?.trim();
    if (validServerPass && editorPass === validServerPass) {
      return {
        authorized: true,
        user: editorUser,
        authMethod: 'editor_credentials',
      };
    } else {
      console.warn(`[AUTH] Intento de autorización: editor_credentials | DENEGADO (usuario: ${editorUser})`);
    }
  }

  return {
    authorized: false,
    authMethod: 'unauthorized',
    error: 'Acceso no autorizado en servidor: Se requiere sesión de cuerpo técnico o credenciales de editor válidas.',
  };
}
