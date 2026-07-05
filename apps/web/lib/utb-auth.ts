/** Validación de credenciales UTB Te acompaña (correo + contraseña) */

export const UTB_EMAIL_DOMAIN = '@utb.edu.co';

export function isUtbEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(UTB_EMAIL_DOMAIN);
}
