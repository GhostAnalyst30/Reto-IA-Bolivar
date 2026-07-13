import { getPortalForSession } from '@/lib/app-config';
import { proxyJson } from '@/lib/proxy';

const SESSION_REGISTER_TIMEOUT_MS = 5000;

export type SessionRegisterResult = {
  ok: boolean;
  timedOut?: boolean;
};

export async function registerUserSession(role: string): Promise<SessionRegisterResult> {
  const portal = getPortalForSession(role);
  const body = JSON.stringify({
    portal,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    device_label: typeof navigator !== 'undefined' ? navigator.platform : '',
  });

  const registerPromise = proxyJson('/sessions/register', {
    method: 'POST',
    body,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('SESSION_TIMEOUT')), SESSION_REGISTER_TIMEOUT_MS);
  });

  try {
    await Promise.race([registerPromise, timeoutPromise]);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_TIMEOUT') {
      return { ok: false, timedOut: true };
    }
    return { ok: false };
  }
}
