import { getSupabaseServerClient } from './supabase-server';

export interface AuthVerificationResult {
  authorized: boolean;
  user?: string;
  authMethod: 'supabase_token' | 'editor_credentials' | 'unauthorized';
  error?: string;
}

/**
 * Módulo de verificación de autorización exclusivo del servidor para rutas de Rivales.
 * NUNCA utiliza valores por defecto escritos en código ni autoriza mediante passkeys antiguas.
 */
export async function verifyServerAuthorization(req: Request): Promise<AuthVerificationResult> {
  // 1. Verificación por Token JWT de Supabase Auth
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
          ].filter((email): email is string => Boolean(email));

          const isAuthorized = allowedEmails.length > 0 && allowedEmails.includes(userEmail);

          if (isAuthorized) {
            console.log(`[AUTH] Resultado: AUTORIZADO (metodo: supabase_token, usuario_id: ${user.id})`);
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

  // 2. Verificación por credenciales de usuario editor mediante variables de servidor privadas
  const editorUser = req.headers.get('x-editor-user')?.trim().toLowerCase();
  const editorPass = req.headers.get('x-editor-pass')?.trim();

  const serverPasswords: Record<string, string | undefined> = {
    zigor: process.env.EDIT_PASSWORD_ZIGOR,
    aitor: process.env.EDIT_PASSWORD_AITOR,
    nacho: process.env.EDIT_PASSWORD_NACHO,
  };

  if (editorUser && editorPass && serverPasswords[editorUser]) {
    const validServerPass = serverPasswords[editorUser];
    if (validServerPass && editorPass === validServerPass) {
      console.log(`[AUTH] Resultado: AUTORIZADO (metodo: editor_credentials, usuario: ${editorUser})`);
      return {
        authorized: true,
        user: editorUser,
        authMethod: 'editor_credentials',
      };
    }
  }

  console.log('[AUTH] Resultado: DENEGADO (metodo: unauthorized)');
  return {
    authorized: false,
    authMethod: 'unauthorized',
    error: 'Acceso no autorizado en servidor: Credenciales o token de usuario no válidos.',
  };
}
