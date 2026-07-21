const PASSKEY_STORAGE_KEY = 'indautxu_staff_passkey';

/**
 * Obtiene la clave del cuerpo técnico guardada en la sesión del navegador.
 */
export function getStaffPasskey(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(PASSKEY_STORAGE_KEY) || '';
}

/**
 * Guarda la clave del cuerpo técnico en la sesión del navegador para reutilizarla.
 */
export function setStaffPasskey(passkey: string): void {
  if (typeof window === 'undefined') return;
  if (passkey) {
    window.sessionStorage.setItem(PASSKEY_STORAGE_KEY, passkey.trim());
  }
}

/**
 * Elimina la clave del cuerpo técnico de la sesión en caso de error de autenticación.
 */
export function clearStaffPasskey(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PASSKEY_STORAGE_KEY);
}
