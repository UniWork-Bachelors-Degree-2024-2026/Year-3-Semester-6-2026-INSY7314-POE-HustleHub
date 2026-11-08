import { useCallback, useEffect, useState } from "react";
import { toApiError } from "../services/marketApi.ts";
import type { ApiError } from "../services/api.ts";

interface State<T> {
  data?: T;
  error?: ApiError;
  loading: boolean;
}

/** Runs `fetcher` on mount (and whenever it changes) and exposes reload(). Memoise `fetcher` with useCallback. */
export function useApi<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    fetcher().then(
      (data) => live && setState({ data, loading: false }),
      (err) => live && setState({ loading: false, error: toApiError(err) }),
    );
    return () => {
      live = false;
    };
  }, [fetcher, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}
