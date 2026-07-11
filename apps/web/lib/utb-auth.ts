/** Validación de correo institucional UTB Te acompaña */

export const UTB_EMAIL_DOMAIN = '@utb.edu.co';

/** Excepción temporal de dominio para pruebas fuera de @utb.edu.co */
export const UTB_EMAIL_EXCEPTIONS = ['ascendraemmanuel@gmail.com'] as const;

export function isUtbEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  return (
    normalizedEmail.endsWith(UTB_EMAIL_DOMAIN) ||
    UTB_EMAIL_EXCEPTIONS.includes(normalizedEmail as (typeof UTB_EMAIL_EXCEPTIONS)[number])
  );
}