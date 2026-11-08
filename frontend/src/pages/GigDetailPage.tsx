import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createBooking, getGig } from "../services/marketApi.ts";
import { toApiError } from "../services/marketApi.ts";
import type { ApiError } from "../services/api.ts";
import { useApi } from "../hooks/useApi.ts";
import type { Booking, Gig, Transaction } from "../models/market.ts";
import { ErrorBox, ErrorList, Loading } from "../components/StateViews.tsx";
import { BackIcon, ClockIcon } from "../components/MarketIcons.tsx";
import { useToast } from "../components/ToastContext.ts";
import { getUser } from "../services/session.ts";
import { CheckIcon } from "../components/Icons.tsx";
import { DatePicker } from "../components/DatePicker.tsx";
import { artFor } from "../utils/categories.ts";
import { dlong, initials, money, todayISO } from "../utils/format.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { liveClean, sanitizeText } from "../utils/sanitize.ts";

type Pay = "simulated_card" | "simulated_eft";

function BookingPanel({ gig }: { gig: Gig }) {
  const nav = useNavigate();
  const toast = useToast();
  const user = getUser();
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState("");
  const [briefErr, setBriefErr] = useState("");
  const [dateErr, setDateErr] = useState("");
  const today = todayISO();
  const [date, setDate] = useState("");
  const [pay, setPay] = useState<Pay>("simulated_card");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [done, setDone] = useState<{ booking: Booking; transaction: Transaction } | null>(null);
  const owner = gig.freelancer?.username ?? "the freelancer";
  const first = owner.split(" ")[0];
  const isOwn = gig.freelancer?._id === user?._id;

  function next() {
    // Sanitise first, then the cleaned text must match the whitelist pattern
    const clean = sanitizeText(brief, { multiline: true });
    let ok = true;
    if (!PATTERNS.bookingBrief.test(clean)) {
      setBriefErr("Add a brief of 10 to 1000 characters, using only letters, numbers and basic punctuation.");
      ok = false;
    } else setBriefErr("");
    if (date && (!PATTERNS.isoDate.test(date) || date < today)) {
      setDateErr("Choose today or a future date.");
      ok = false;
    } else setDateErr("");
    if (ok) setStep(2);
  }

  async function confirm() {
    if (busy) return;
    if (!PATTERNS.objectId.test(gig._id) || !PATTERNS.paymentMethod.test(pay)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await createBooking({
        gigId: gig._id,
        requirements: sanitizeText(brief, { multiline: true }),
        scheduledDate: date || undefined,
        paymentMethod: pay,
      });
      setDone(res);
      setStep(3);
      toast(`Booking confirmed. Transaction ${res.transaction.reference} recorded.`);
    } catch (e) {
      setErr(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const on = (n: number) => (step >= n ? "on" : "");

  return (
    <div className='panel book' aria-label='Book this gig'>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className='steps'>
          <span className={on(1)}>01 Details</span>
          <span className={on(2)}>02 Confirm</span>
          <span className={on(3)}>03 Done</span>
        </div>
        <div className='bar'>
          <span style={{ width: `${step * 33.4}%` }} />
        </div>
      </div>

      {isOwn && (
        <div className='alert alert-warn' role='alert'>
          <ClockIcon />
          <span>You cannot book your own gig.</span>
        </div>
      )}

      {step === 1 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className='h-md'>Book this gig</h2>
            <span className='mono' style={{ fontSize: 22 }}>
              {money(gig.price)}
            </span>
          </div>
          <div className='field-wrap'>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label className='label' htmlFor='brief'>
                Project brief
              </label>
              <span className='hint mono'>{brief.length} / 1000</span>
            </div>
            <textarea
              className={`field ${briefErr ? "bad" : ""}`}
              id='brief'
              rows={3}
              maxLength={1000}
              placeholder='Your business, audience and timeline.'
              value={brief}
              onChange={(e) => setBrief(liveClean(e.target.value))}
            />
            {briefErr && <span className='err-text'>{briefErr}</span>}
          </div>
          <div className='field-wrap'>
            <label className='label' htmlFor='sched'>
              Preferred date (optional)
            </label>
            <DatePicker id='sched' min={today} value={date} onChange={setDate} invalid={Boolean(dateErr)} />
            {dateErr && <span className='err-text'>{dateErr}</span>}
          </div>
          <button className='btn' onClick={next} disabled={isOwn} style={{ minHeight: 52 }}>
            Continue · {money(gig.price)}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className='h-md'>Review and pay</h2>
          <dl className='sum'>
            <div>
              <dt>Gig</dt>
              <dd style={{ fontWeight: 700, textAlign: "right" }}>{gig.title}</dd>
            </div>
            <div>
              <dt>Freelancer</dt>
              <dd>{owner}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {gig.deliveryTimeDays} {gig.deliveryTimeDays === 1 ? "day" : "days"}
              </dd>
            </div>
            {date && (
              <div>
                <dt>Preferred date</dt>
                <dd>{dlong(date)}</dd>
              </div>
            )}
            <div style={{ paddingTop: 14, borderTop: "1px dashed var(--line-strong)", alignItems: "baseline" }}>
              <dt style={{ color: "var(--fg)", fontWeight: 700 }}>Total</dt>
              <dd className='mono' style={{ fontSize: 26, color: "var(--cyan)" }}>
                {money(gig.price)}
              </dd>
            </div>
          </dl>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className='label' style={{ padding: 0, marginBottom: 8 }}>
              Simulated payment method
            </legend>
            <div className='pay-pick'>
              <button type='button' aria-pressed={pay === "simulated_card"} onClick={() => setPay("simulated_card")}>
                Card
              </button>
              <button type='button' aria-pressed={pay === "simulated_eft"} onClick={() => setPay("simulated_eft")}>
                EFT
              </button>
            </div>
          </fieldset>
          {err &&
            (err.status === 429 ? (
              <div className='alert alert-warn' role='alert'>
                <ClockIcon />
                <span>{err.message}</span>
              </div>
            ) : (
              <ErrorList message={err.message} errors={err.errors} />
            ))}
          <p className='alert alert-info' style={{ margin: 0 }}>
            Simulated payment. Confirming creates a booking and a transaction record for you and {first}.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <button
              className='btn btn-ghost'
              onClick={() => {
                setStep(1);
                setErr(null);
              }}
              disabled={busy}
            >
              Back
            </button>
            <button className='btn' onClick={confirm} disabled={busy}>
              {busy ? "Confirming..." : "Confirm and pay"}
            </button>
          </div>
        </>
      )}

      {step === 3 && done && (
        <div
          role='status'
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}
        >
          <span className='check-wrap'>
            <span className='rip' />
            <span className='chk'>
              <CheckIcon size={32} />
            </span>
          </span>
          <h2 className='h-md' style={{ fontSize: 28 }}>
            You're booked.
          </h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>{first} has been notified.</p>
          <div className='ticket'>
            <div>
              <span style={{ color: "var(--muted)" }}>Transaction</span>
              <span>{done.transaction.reference}</span>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Gig</span>
              <span style={{ textAlign: "right" }}>{gig.title}</span>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Date</span>
              <span>{dlong(done.transaction.timestamp)}</span>
            </div>
            <div style={{ borderTop: "1.5px dashed var(--line-strong)", margin: "4px 0", padding: 0 }} />
            <div style={{ alignItems: "baseline" }}>
              <span style={{ color: "var(--muted)" }}>Paid</span>
              <span style={{ fontSize: 22, color: "var(--cyan)" }}>{money(done.transaction.amount)}</span>
            </div>
          </div>
          <button className='btn' onClick={() => nav("/bookings")} style={{ width: "100%" }}>
            View my bookings
          </button>
        </div>
      )}
    </div>
  );
}

function GigBody({ id }: { id: string }) {
  const fetcher = useCallback(() => getGig(id), [id]);
  const { data: gig, error, loading, reload } = useApi(fetcher);

  if (loading && !gig) return <Loading rows={2} height={260} />;
  if (error) {
    return error.status === 404 || error.status === 400 ? (
      <div className='empty'>
        This gig is no longer available.
        <br />
        <br />
        <Link className='btn' to='/explore'>
          Back to explore
        </Link>
      </div>
    ) : (
      <ErrorBox error={error} onRetry={reload} />
    );
  }
  if (!gig) return null;
  if (gig.status !== "active") {
    return (
      <div className='empty'>
        This gig is no longer available.
        <br />
        <br />
        <Link className='btn' to='/explore'>
          Back to explore
        </Link>
      </div>
    );
  }
  const owner = gig.freelancer?.username ?? "Freelancer";

  return (
    <div className='split'>
      <article className='main'>
        <div className='hero-art'>
          <div className={`spin ${artFor(gig.category)}`} aria-hidden='true' />
          <span className='cover-tag'>{gig.category}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className='h-lg'>{gig.title}</h1>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className='avatar' style={{ width: 42, height: 42 }}>
              {initials(owner)}
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              {gig.freelancer?._id ? (
                <Link className='pf-name-link' to={`/u/${gig.freelancer._id}`}>
                  {owner}
                </Link>
              ) : (
                <strong>{owner}</strong>
              )}
              <span style={{ fontSize: 14, color: "var(--muted)" }}>
                Freelancer · Delivers in {gig.deliveryTimeDays} {gig.deliveryTimeDays === 1 ? "day" : "days"}
              </span>
            </span>
          </span>
        </div>
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className='label' style={{ margin: 0, fontWeight: 500 }}>
            About this gig
          </h2>
          {/* Rendered as plain text; React escapes it, so stored markup can never execute. */}
          <p
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--soft)",
              maxWidth: 660,
              whiteSpace: "pre-wrap",
            }}
          >
            {gig.description}
          </p>
        </section>
      </article>
      <aside className='aside'>
        <BookingPanel gig={gig} />
      </aside>
    </div>
  );
}

export function GigDetailPage() {
  const { id = "" } = useParams();
  // A route id that is not a valid ObjectId never reaches the API
  if (!PATTERNS.objectId.test(id)) {
    return (
      <div className='empty'>
        This gig is no longer available.
        <br />
        <br />
        <Link className='btn' to='/explore'>
          Back to explore
        </Link>
      </div>
    );
  }
  return (
    <>
      <Link
        className='navlink'
        to='/explore'
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "0 6px" }}
      >
        <BackIcon />
        Back to explore
      </Link>
      <GigBody key={id} id={id} />
    </>
  );
}
