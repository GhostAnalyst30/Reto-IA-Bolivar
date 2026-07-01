import { getPortalForSession } from '@/lib/app-config';
import { proxyJson } from '@/lib/proxy';

export async function registerUserSession(role: string) {
  const portal = getPortalForSession(role);
  try {
    await proxyJson('/sessions/register', {
      method: 'POST',
      body: JSON.stringify({
        portal,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        device_label: typeof navigator !== 'undefined' ? navigator.platform : '',
      }),
    });
  } catch {
    /* non-blocking */
  }
}
