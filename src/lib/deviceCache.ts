import { useEffect, useRef, useState } from "react";
import { getTelegramWebApp } from "./telegram";

const CACHE_PREFIX = "dvcache_";

function getStorage() {
  return getTelegramWebApp()?.DeviceStorage;
}

async function typedGetItem(key: string): Promise<string | null> {
  const storage = getStorage();
  if (storage) {
    try { return await storage.getItem(key); } catch { /* fall through */ }
  }
  try { return localStorage.getItem(key); } catch { return null; }
}

async function typedSetItem(key: string, value: string): Promise<void> {
  const storage = getStorage();
  if (storage) {
    try { await storage.setItem(key, value); return; } catch { /* fall through */ }
  }
  try { localStorage.setItem(key, value); } catch { /* quota */ }
}

function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useDeviceCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 15 * 60 * 1000
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ck = cacheKey(key);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const raw = await typedGetItem(ck);
        if (raw && !cancelled) {
          try {
            const entry = JSON.parse(raw) as CacheEntry<T>;
            if (Date.now() - entry.timestamp < ttlMs) {
              setData(entry.data);
              setLoading(false);
            }
          } catch { /* parse failed, fetch fresh */ }
        }

        const fresh = await fetcher();
        if (!cancelled) {
          setData(fresh);
          setLoading(false);
          setError(null);
          typedSetItem(ck, JSON.stringify({ data: fresh, timestamp: Date.now() }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data.");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [ck]);

  return { data, loading, error };
}
