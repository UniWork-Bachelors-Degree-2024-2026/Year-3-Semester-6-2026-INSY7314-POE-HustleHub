import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteGig, getMyGigs, updateGig, toApiError } from "../services/marketApi.ts";
import { useApi } from "../hooks/useApi.ts";
import type { Gig } from "../models/market.ts";
import { EditIcon, PlusIcon, TrashIcon } from "../components/MarketIcons.tsx";
import { PageHeader } from "../components/ReactBits.tsx";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { useToast } from "../components/ToastContext.ts";
import { artFor } from "../utils/categories.ts";
import { money } from "../utils/format.ts";

function GigsList({ gigs, onChange }: { gigs: Gig[]; onChange: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const target = gigs.find((g) => g._id === confirmId);

  if (!gigs.length)
    return (
      <div className='empty'>
        You have no gigs yet.
        <br />
        <br />
        <Link className='btn' to='/my-gigs/new'>
          Create your first gig
        </Link>
      </div>
    );

  async function toggle(g: Gig) {
    setErr("");
    try {
      const next = g.status === "active" ? "paused" : "active";
      await updateGig(g._id, { status: next });
      toast(next === "active" ? "Gig is live." : "Gig paused. Clients can no longer book it.");
      onChange();
    } catch (e) {
      setErr(toApiError(e).message);
    }
  }
  async function remove() {
    if (!confirmId || busy) return;
    setBusy(true);
    setErr("");
    try {
      await deleteGig(confirmId);
      toast("Gig deleted.");
      setConfirmId(null);
      onChange();
    } catch (e) {
      setErr(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }
  const label = (s: Gig["status"]) => (s === "active" ? "Live" : s === "paused" ? "Paused" : "Draft");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {err && (
        <div className='alert alert-danger' role='alert'>
          {err}
        </div>
      )}
      {target && (
        <div className='confirm' role='alertdialog' aria-label='Delete gig'>
          <span>
            Delete <strong>{target.title}</strong>? Past bookings and transactions stay on record.
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className='btn btn-ghost' style={{ minHeight: 42 }} onClick={() => setConfirmId(null)}>
              Keep it
            </button>
            <button className='btn btn-danger' style={{ minHeight: 42 }} onClick={remove} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </button>
          </span>
        </div>
      )}
      {gigs.map((g) => (
        <div key={g._id} className='gigrow'>
          <span className={`thumb ${artFor(g.category)}`} />
          <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <strong style={{ fontSize: 16 }}>{g.title}</strong>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: g.status === "active" ? "var(--green)" : "var(--faint)",
                }}
              />
              {label(g.status)} · {g.category} · {g.deliveryTimeDays} {g.deliveryTimeDays === 1 ? "day" : "days"}
            </span>
          </div>
          <span className='mono'>{money(g.price)}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              className='btn btn-ghost'
              style={{ minHeight: 44, padding: "0 12px", fontSize: 13 }}
              onClick={() => toggle(g)}
            >
              {g.status === "active" ? "Pause" : "Go live"}
            </button>
            <button className='icon-btn' onClick={() => nav(`/my-gigs/${g._id}/edit`)} aria-label={`Edit ${g.title}`}>
              <EditIcon />
            </button>
            <button
              className='icon-btn'
              onClick={() => setConfirmId(g._id)}
              aria-label={`Delete ${g.title}`}
              style={{ color: "var(--red)" }}
            >
              <TrashIcon />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

export function MyGigsPage() {
  const fetcher = useCallback(() => getMyGigs(), []);
  const { data, error, loading, reload } = useApi(fetcher);
  return (
    <>
      <PageHeader eyebrow='Your listings' title='My gigs'>
        <Link className='btn' to='/my-gigs/new'>
          <PlusIcon />
          New gig
        </Link>
      </PageHeader>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Loading rows={2} height={90} />}
      {data && <GigsList gigs={data} onChange={reload} />}
    </>
  );
}
