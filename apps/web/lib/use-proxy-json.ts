'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { proxyJson, ProxyError } from '@/lib/proxy';

export function useProxyJson<T>(
  path: string | null,
  config?: SWRConfiguration<T>,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    path,
    (p: string) => proxyJson<T>(p),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
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
