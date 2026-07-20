'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { proxyJson, ProxyError } from '@/lib/proxy';

export function useProxyJson<T>(
  path: string | null,
  config?: SWRConfiguration<T>,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    path,
    async (p: string) => {
      try {
        return await proxyJson<T>(p, { soft: true });
      } catch (e) {
        // Auth / permission errors still surface; 5xx already soft-handled.
        if (e instanceof ProxyError && (e.status === 401 || e.status === 403)) {
          throw e;
        }
        // Keep UI alive with empty degraded payload for unexpected throws.
        return { degraded: true } as T;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
      shouldRetryOnError: (err) => {
        if (err instanceof ProxyError && (err.status === 401 || err.status === 403)) return false;
        return true;
      },
      ...config,
    },
  );

  const message =
    error instanceof ProxyError
      ? error.message
      : error instanceof Error
        ? error.message
        : error
          ? 'Error al cargar datos'
          : undefined;

  return { data, error: message, isLoading: isLoading && !data, isValidating, mutate };
}
