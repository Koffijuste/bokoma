// hooks/useOrdersPolling.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PollingOptions<T> {
  fetchFn: () => Promise<T[]>;
  interval?: number;
  enabled?: boolean;
  getId: (item: T) => string;
  onNewItem?: (item: T) => void;
  onStatusChange?: (item: T, oldStatus: string, newStatus: string) => void;
}

export function useOrdersPolling<T extends { _id: string; status?: string; createdAt?: string }>(
  options: PollingOptions<T>
) {
  const {
    fetchFn,
    interval = 5 * 60 * 1000, // ✅ 5 MINUTES par défaut (au lieu de 60s)
    enabled = true,
    getId,
    onNewItem,
    onStatusChange,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  const previousItemsRef = useRef<Map<string, T>>(new Map());
  const firstLoadRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  
  // ✅ Refs stables pour éviter les recréations
  const fetchFnRef = useRef(fetchFn);
  const getIdRef = useRef(getId);
  const onNewItemRef = useRef(onNewItem);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    getIdRef.current = getId;
    onNewItemRef.current = onNewItem;
    onStatusChangeRef.current = onStatusChange;
  }, [fetchFn, getId, onNewItem, onStatusChange]);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    
    // ✅ THROTTLE STRICT : 1 requête max toutes les 30 secondes
    if (now - lastFetchTimeRef.current < 30000) {
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      const newItems = await fetchFnRef.current();
      const newItemsMap = new Map(newItems.map(item => [getIdRef.current(item), item]));

      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setItems(newItems);
        previousItemsRef.current = newItemsMap;
        setLoading(false);
        setLastFetch(new Date());
        return;
      }

      const freshIds = new Set<string>();
      newItems.forEach(item => {
        const id = getIdRef.current(item);
        if (!previousItemsRef.current.has(id)) {
          freshIds.add(id);
          onNewItemRef.current?.(item);
        }
      });

      newItems.forEach(item => {
        const id = getIdRef.current(item);
        const previous = previousItemsRef.current.get(id);
        if (previous && previous.status !== item.status) {
          onStatusChangeRef.current?.(item, previous.status || '', item.status || '');
        }
      });

      setItems(newItems);
      setNewItemIds(freshIds);
      previousItemsRef.current = newItemsMap;
      setLastFetch(new Date());
      setError(null);

      if (freshIds.size > 0) {
        setTimeout(() => setNewItemIds(new Set()), 30000);
      }

    } catch (err: any) {
      setError(err?.message || 'Erreur de rafraîchissement');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchData();
    const intervalId = setInterval(fetchData, interval);

    // ✅ Rafraîchir UNIQUEMENT au retour sur l'onglet (pas au focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Reset du throttle pour forcer un fetch immédiat
        lastFetchTimeRef.current = 0;
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval, fetchData]);

  const refresh = useCallback(() => {
    firstLoadRef.current = false;
    lastFetchTimeRef.current = 0; // Reset throttle
    return fetchData();
  }, [fetchData]);

  return {
    items,
    loading,
    error,
    newItemIds,
    lastFetch,
    refresh,
    isNew: (id: string) => newItemIds.has(id),
  };
}