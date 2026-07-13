export type AuthTransitionStepId = 'auth' | 'profile' | 'session' | 'navigate' | 'portal';

export type AuthTransitionStepStatus = 'pending' | 'active' | 'done' | 'skipped' | 'error';

export interface AuthTransitionStep {
  id: AuthTransitionStepId;
  label: string;
  status: AuthTransitionStepStatus;
  error?: string;
}

export const AUTH_TRANSITION_STEP_DEFS: ReadonlyArray<{
  id: AuthTransitionStepId;
  label: string;
}> = [
  { id: 'auth', label: 'Verificando credenciales' },
  { id: 'profile', label: 'Cargando tu perfil' },
  { id: 'session', label: 'Iniciando sesión segura' },
  { id: 'navigate', label: 'Preparando tu portal' },
  { id: 'portal', label: 'Cargando panel principal' },
];

export type AuthTransitionPhase = 'idle' | 'running' | 'done' | 'error';

export function createInitialSteps(): AuthTransitionStep[] {
  return AUTH_TRANSITION_STEP_DEFS.map((step) => ({
    ...step,
    status: 'pending' as AuthTransitionStepStatus,
  }));
}

export function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed') || lower.includes('correo no confirmado')) {
    return 'Confirma tu correo antes de entrar. Revisa tu bandeja o solicita un nuevo enlace.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos';
  }
  return message || 'No se pudo iniciar sesión';
}
