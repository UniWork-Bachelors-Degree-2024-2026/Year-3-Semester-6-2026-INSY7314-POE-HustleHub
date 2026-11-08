import { useState } from "react";
import { updateBookingStatus, toApiError } from "../services/marketApi.ts";
import { useLedger } from "../hooks/useLedger.ts";
import type { LedgerRow } from "../models/market.ts";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { StatusTag } from "../components/StatusTag.tsx";
import { useToast } from "../components/ToastContext.ts";
import { PersonLink } from "../components/PersonLink.tsx";
import { dshort, initials, money, shortTitle } from "../utils/format.ts";

function BookingsTable({ rows, onChange }: { rows: LedgerRow[]; onChange: () => void }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  if (!rows.length)
    return <div className='empty'>No bookings yet. When a client books one of your gigs it shows up here.</div>;

  async function move(id: string, status: string, msg: string) {
    setBusyId(id);
    setErr("");
    try {
      await updateBookingStatus(id, status);
      toast(msg);
      onChange();
    } catch (e) {
      setErr(toApiError(e).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {err && (
        <div className='alert alert-danger' role='alert'>
          {err}
        </div>
      )}
      <div className='tablebox'>
        <table>
          <thead>
            <tr>
              <th scope='col'>Client</th>
              <th scope='col'>Gig</th>
              <th scope='col'>Booked</th>
              <th scope='col' className='num'>
                You earn
              </th>
              <th scope='col'>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const name = b.client?.username ?? "Client";
              return (
                <tr key={b.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className='avatar sm'>{initials(name)}</span>
                      <PersonLink user={b.client} fallback='Client' />
                    </span>
                  </td>
                  <td style={{ minWidth: 200, color: "var(--soft)" }}>
                    {shortTitle(b.gigTitle)}
                    <br />
                    <span className='mono' style={{ fontSize: 12, color: "var(--dim)" }}>
                      {b.reference}
                    </span>
                  </td>
                  <td className='mono' style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {dshort(b.date)}
                  </td>
                  <td className={`num ${b.counted ? "" : "struck"}`}>{money(b.amount)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className='cell-actions'>
                      <StatusTag status={b.status} />
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button
                          className='btn btn-ghost'
                          style={{ minHeight: 34, padding: "0 10px", fontSize: 13 }}
                          disabled={busyId === b.id}
                          onClick={() => move(b.id, "in_progress", "Marked as in progress.")}
                        >
                          Start work
                        </button>
                      )}
                      {b.status === "in_progress" && (
                        <button
                          className='btn btn-ghost'
                          style={{ minHeight: 34, padding: "0 10px", fontSize: 13 }}
                          disabled={busyId === b.id}
                          onClick={() => move(b.id, "completed", "Marked as delivered.")}
                        >
                          Mark delivered
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function FreelancerBookingsPage() {
  const { data, error, loading, reload } = useLedger();
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className='label'>Work</span>
        <h1 className='h-xl'>Bookings</h1>
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Loading rows={3} height={90} />}
      {data && <BookingsTable rows={data} onChange={reload} />}
    </>
  );
}
