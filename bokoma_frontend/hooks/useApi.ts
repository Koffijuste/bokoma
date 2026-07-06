import { useState, useCallback, useEffect } from 'react';
import type { ApiError } from '@/types';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  deps: unknown[] = [],
  immediate = true
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error: any) {
      setState({ data: null, loading: false, error });
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {
        // Error state will be handled by execute.
      });
    }
  }, [execute, immediate]);

  return { ...state, execute };
}

interface UseFetchOptions {
  skip?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  options?: UseFetchOptions
) {
  const { data, loading, error, execute } = useAsync(
    fetchFn,
    deps,
    !options?.skip
  );

  return {
    data: data as T | null,
    loading,
    error: error as ApiError | null,
    refetch: execute,
  };
}

interface UseMutationState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  success: boolean;
}

export function useMutation<T, D>(mutationFn: (data: D) => Promise<T>) {
  const [state, setState] = useState<UseMutationState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const mutate = useCallback(
    async (data: D) => {
      setState({ data: null, loading: true, error: null, success: false });
      try {
        const result = await mutationFn(data);
        setState({ data: result, loading: false, error: null, success: true });
        return result;
      } catch (error: any) {
        setState({ data: null, loading: false, error, success: false });
        throw error;
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, success: false });
  }, []);

  return { ...state, mutate, reset };
}
