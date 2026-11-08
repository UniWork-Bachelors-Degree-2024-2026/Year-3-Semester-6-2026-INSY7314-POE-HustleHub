import { useState } from "react";
import { Link } from "react-router-dom";
import { PersonLink } from "../components/PersonLink.tsx";
import { cancelBooking } from "../services/marketApi.ts";
import { toApiError } from "../services/marketApi.ts";
import { useLedger } from "../hooks/useLedger.ts";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { StatusTag } from "../components/StatusTag.tsx";
import { useToast } from "../components/ToastContext.ts";
import { artFor } from "../utils/categories.ts";
import { dlong, dshort, money } from "../utils/format.ts";

export function BookingsPage() {
  const { data, error, loading, reload } = useLedger();
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  if (loading && !data)
    return (
      <>
        <h1 className='h-xl'>Your bookings</h1>
        <Loading rows={3} height={110} />
      </>
    );
  if (error)
    return (
      <>
        <h1 className='h-xl'>Your bookings</h1>
        <ErrorBox error={error} onRetry={reload} />
      </>
    );
  const rows = data ?? [];

  if (!rows.length) {
    return (
      <>
        <h1 className='h-xl'>Your bookings</h1>
        <div className='empty'>
          You haven't booked anything yet. Every booking you make shows up here with its receipt.
          <br />
          <br />
          <Link className='btn' to='/explore'>
            Explore gigs
          </Link>
        </div>
      </>
    );
  }

  const spent = rows.filter((r) => r.counted).reduce((s, r) => s + r.amount, 0);
  const open = rows.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status)).length;
  const done = rows.filter((r) => r.status === "completed").length;
  const target = rows.find((r) => r.id === confirmId);

  async function doCancel() {
    if (!confirmId || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await cancelBooking(confirmId);
      toast("Booking cancelled.");
      setConfirmId(null);
      reload();
    } catch (e) {
      setActionError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  function copyCsv() {
    const lines = [["Transaction", "Gig", "Freelancer", "Status", "Date", "Amount"]].concat(
      rows.map((r) => [
        r.reference,
        r.gigTitle,
        r.freelancer?.username ?? "",
        r.status,
        r.date.slice(0, 10),
        r.amount.toFixed(2),
      ]),
    );
    // Quote every cell and neutralise spreadsheet formulas (CSV injection).
    const safe = (c: string) => '"' + (/^[=+\-@]/.test(c) ? "'" + c : c).replace(/"/g, '""') + '"';
    const csv = lines.map((r) => r.map(safe).join(",")).join("\n");
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(csv).then(
        () => toast("Transactions copied as CSV."),
        () => toast("Copy was blocked by the browser."),
      );
    else toast("Copy is not available in this browser.");
  }

  return (
    <>
      <div
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}
      >
        <h1 className='h-xl'>Your bookings</h1>
        <button className='btn btn-ghost' onClick={copyCsv}>
          Copy transactions as CSV
        </button>
      </div>

      <section className='stats' aria-label='Summary'>
        <div className='stat wide'>
          <span className='label'>Total spent</span>
          <span className='money-xl'>{money(spent)}</span>
          <span className='sub'>across {rows.filter((r) => r.counted).length} transactions</span>
        </div>
        <div className='stat hot'>
          <span className='label'>In progress</span>
          <span className='big'>{open}</span>
        </div>
        <div className='stat'>
          <span className='label'>Delivered</span>
          <span className='big'>{done}</span>
        </div>
      </section>

      {target && (
        <div className='confirm' role='alertdialog' aria-label='Cancel booking'>
          <span>
            Cancel <strong>{target.gigTitle}</strong>? This cannot be undone.
            {actionError && (
              <>
                <br />
                {actionError}
              </>
            )}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              className='btn btn-ghost'
              style={{ minHeight: 42 }}
              onClick={() => {
                setConfirmId(null);
                setActionError("");
              }}
            >
              Keep it
            </button>
            <button className='btn btn-danger' style={{ minHeight: 42 }} onClick={doCancel} disabled={busy}>
              {busy ? "Cancelling..." : "Cancel booking"}
            </button>
          </span>
        </div>
      )}

      <div className='split'>
        <section style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className='h-md'>Timeline</h2>
          <ol className='timeline'>
            {rows.map((r) => (
              <li key={r.id}>
                <span className={`node ${r.status === "in_progress" || r.status === "confirmed" ? "live" : ""}`} />
                <div className='tl-card'>
                  <span className={`thumb ${artFor(r.category)}`} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    <strong style={{ lineHeight: 1.35 }}>{r.gigTitle}</strong>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      <PersonLink user={r.freelancer} fallback='Freelancer' /> · {dshort(r.date)}
                    </span>
                    <span className='cell-actions'>
                      <StatusTag status={r.status} />
                      {(r.status === "pending" || r.status === "confirmed") && (
                        <button
                          className='btn btn-ghost'
                          style={{ minHeight: 30, padding: "0 10px", fontSize: 12 }}
                          onClick={() => {
                            setConfirmId(r.id);
                            setActionError("");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section style={{ flex: "2 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className='h-md'>Transactions</h2>
          <div className='tablebox'>
            <table>
              <thead>
                <tr>
                  <th scope='col'>Transaction</th>
                  <th scope='col'>Gig</th>
                  <th scope='col'>Date</th>
                  <th scope='col' className='num'>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className='mono' style={{ fontSize: 13, color: "var(--cyan)", whiteSpace: "nowrap" }}>
                      {r.reference}
                    </td>
                    <td style={{ minWidth: 220 }}>
                      {r.gigTitle}
                      <br />
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>
                        <PersonLink user={r.freelancer} fallback='Freelancer' />
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{dlong(r.date)}</td>
                    <td className={`num ${r.counted ? "" : "struck"}`}>{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
