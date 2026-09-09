import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const COACH_SESSION_COOKIE_NAME = 'coach_staff_session';
export const COACH_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface CoachSessionPayload {
  role: 'coach_staff';
  authorized: true;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('AUTH_SESSION_SECRET no está configurada en las variables privadas de servidor.');
  }
  return secret.trim();
}

/**
 * Genera un token firmado con HMAC-SHA256 para la sesión general del staff.
 * NO contiene contraseñas, passkeys ni secretos en su interior.
 */
export function createSignedCoachSessionToken(): string {
  const secret = getSessionSecret();
  const now = Date.now();
  const sessionData: CoachSessionPayload = {
    role: 'coach_staff',
    authorized: true,
    iat: now,
    exp: now + COACH_SESSION_DURATION_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Valida la firma criptográfica HMAC-SHA256 y la fecha de expiración del token.
 * Devuelve el payload si es válido o null si fue alterado, firmado con otra clave o caducado.
 */
export function verifyCoachSessionToken(token: string | undefined | null): CoachSessionPayload | null {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return null;
    }

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      return null;
    }

    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    // Comparación en tiempo constante para mitigar ataques de temporización
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const sessionData = JSON.parse(payloadJson) as CoachSessionPayload;

    if (!sessionData.exp || sessionData.exp < Date.now() || sessionData.role !== 'coach_staff') {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

/**
 * Helper para verificar la sesión desde cualquier ruta de API que reciba Request o NextRequest.
 */
export function isCoachSessionAuthorizedFromRequest(req: Request | NextRequest): boolean {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COACH_SESSION_COOKIE_NAME}=([^;]+)`));
    const token = match ? match[1] : null;
    return verifyCoachSessionToken(token) !== null;
  } catch {
    return false;
  }
}

/**
 * Helper para verificar la sesión en Server Components o endpoints que usen cookies() de next/headers.
 */
export async function isCoachSessionAuthorized(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COACH_SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return false;
    return verifyCoachSessionToken(sessionCookie.value) !== null;
  } catch {
    return false;
  }
}
