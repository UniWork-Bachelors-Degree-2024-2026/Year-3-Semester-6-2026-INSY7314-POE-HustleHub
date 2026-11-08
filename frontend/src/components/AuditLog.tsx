import { useCallback, useState } from "react";
import { useApi } from "../hooks/useApi.ts";
import { getAuditEvents } from "../services/marketApi.ts";
import type { AuditEventType } from "../models/market.ts";
import { dtime } from "../utils/format.ts";
import { ErrorBox, Loading } from "./StateViews.tsx";

// Plain language names for the event types the API records
const TYPE_LABELS: Record<AuditEventType, string> = {
  register: "Registration",
  login: "Login",
  login_2fa: "Two-factor login",
  account_lockout: "Account lockout",
  password_change: "Password change",
  password_reset: "Password reset",
  two_factor_change: "Two-factor setting",
};

const TYPES = Object.keys(TYPE_LABELS) as AuditEventType[];

// The stored security events for admins, newest first, one page at a time, with a filter for the type of event
export function AuditLog() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<AuditEventType | "">("");

  // useCallback keeps one function between renders, so useApi only fetches again when the page or type changes (React, 2026).
  const fetchPage = useCallback(() => {
    if (type === "") return getAuditEvents(page);
    return getAuditEvents(page, type);
  }, [page, type]);
  const { data, error, loading, reload } = useApi(fetchPage);

  // A new filter starts again from the first page
  const changeType = (value: string) => {
    setType(value as AuditEventType | "");
    setPage(1);
  };

  return (
    <section aria-label='Security audit trail' className='tax-section'>
      <div className='tax-head'>
        <h2 className='h-md'>Security audit trail</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label htmlFor='audit-type' style={{ fontSize: 14, color: "var(--muted)" }}>
            Event type
          </label>
          <select
            id='audit-type'
            className='field'
            style={{ width: "auto", minHeight: 44, background: "var(--surface)" }}
            value={type}
            onChange={(e) => changeType(e.target.value)}
          >
            <option value=''>All events</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Loading rows={1} height={200} />}

      {data && data.data.length === 0 && <div className='empty'>No security events have been recorded yet.</div>}

      {data && data.data.length > 0 && (
        <>
          <div className='tablebox'>
            <table>
              <thead>
                <tr>
                  <th scope='col'>When</th>
                  <th scope='col'>Event</th>
                  <th scope='col'>Outcome</th>
                  <th scope='col'>Account</th>
                  <th scope='col'>Address</th>
                  <th scope='col'>Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((event) => (
                  <tr key={event.id}>
                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{dtime(event.createdAt)}</td>
                    <td>{TYPE_LABELS[event.type]}</td>
                    <td>
                      {event.outcome === "success" && <span className='tag tag-live'>Success</span>}
                      {event.outcome === "failure" && <span className='tag tag-bad'>Failed</span>}
                    </td>
                    <td>{event.user?.username ?? "Unknown"}</td>
                    <td className='mono' style={{ fontSize: 13 }}>
                      {event.ip ?? "-"}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{event.detail ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type='button'
              className='btn btn-ghost'
              disabled={data.page <= 1 || loading}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span className='label'>
              Page {data.page} of {data.pages} | {data.total} events
            </span>
            <button
              type='button'
              className='btn btn-ghost'
              disabled={data.page >= data.pages || loading}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// Reference List:
// React, 2026. useCallback. [online] Available at: <https://react.dev/reference/react/useCallback> [Accessed 7 November 2026].
