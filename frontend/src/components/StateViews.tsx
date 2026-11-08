import type { ApiError } from "../services/api.ts";
import { WarnIcon } from "./MarketIcons.tsx";

export function Loading({ rows = 3, height = 120 }: { rows?: number; height?: number }) {
  return (
    <div role='status' aria-label='Loading' style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className='skeleton' style={{ height }} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className='alert alert-danger' role='alert'>
      <WarnIcon />
      <span style={{ flex: 1 }}>{error.message}</span>
      {onRetry && (
        <button type='button' className='linklike' onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ErrorList({ message, errors }: { message: string; errors: string[] }) {
  return (
    <div className='alert alert-danger' role='alert'>
      <WarnIcon />
      <span>
        {message}
        {errors.length > 0 && (
          <ul className='err-list' style={{ marginTop: 6 }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </span>
    </div>
  );
}
