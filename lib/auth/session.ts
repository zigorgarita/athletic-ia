import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'staff_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutos

export interface StaffSessionPayload {
  userId: string;
  name: string;
  role: 'editor' | 'admin';
  exp: number; // Timestamp de expiración
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error('AUTH_SESSION_SECRET no está configurada en las variables privadas de servidor.');
  }
  return secret.trim();
}

/**
 * Genera un token firmado con HMAC-SHA256 para la sesión del staff
 */
export function createSignedSessionToken(payload: Omit<StaffSessionPayload, 'exp'>): string {
  const secret = getSessionSecret();
  const sessionData: StaffSessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Valida un token de sesión firmado y comprueba su expiración
 */
export function verifySessionToken(token: string): StaffSessionPayload | null {
  try {
    if (!token || !token.includes('.')) return null;

    const [payloadBase64, signature] = token.split('.');
    const secret = getSessionSecret();

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const sessionData = JSON.parse(payloadJson) as StaffSessionPayload;

    if (!sessionData.exp || sessionData.exp < Date.now()) {
      return null; // Sesión expirada
    }

    return sessionData;
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión de staff validada a partir de las cookies de la petición
 */
export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    return verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_MS };
