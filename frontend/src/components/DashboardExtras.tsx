import React, { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLedger } from "../hooks/useLedger.ts";
import { getUser } from "../services/session.ts";
import { Donut, LineChart, type MonthPoint } from "./Charts.tsx";
import { CountUp } from "./CountUp.tsx";
import { AnimatedNumber, Reveal, SpotlightCard } from "./ReactBits.tsx";
import { ErrorBox, Loading } from "./StateViews.tsx";
import { TaxSummary } from "./TaxSummary.tsx";
import { dshort, money, monthKey, shortTitle } from "../utils/format.ts";
//React Bits (2026a) provides the Animated Content component (Reveal) which assisted this implementation.
//React Bits (2026b) provides the Count Up component (AnimatedNumber) which assisted this implementation.
//React Bits (2026c) provides the Spotlight Card component which assisted this implementation.

const Arrow = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='M5 12h14M13 6l6 6-6 6' />
  </svg>
);

// card that links to another page
function QuickAction({
  to,
  title,
  text,
  primary = false,
}: {
  to: string;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <SpotlightCard className={`qa-card ${primary ? "qa-primary" : ""}`}>
      <Link to={to} className='qa-link'>
        <span className='qa-text'>
          <strong>{title}</strong>
          <small>{text}</small>
        </span>
        <span className='qa-arrow'>
          <Arrow />
        </span>
      </Link>
    </SpotlightCard>
  );
}

function QuickActions({ children }: { children: ReactNode }) {
  return (
    <Reveal className='qa-row' delay={120}>
      {children}
    </Reveal>
  );
}

// Freelancer view: income chart, income by gig, recent activity and the estimated tax summary
const FreelancerOverview: React.FC = () => {
  const { data, error, loading, reload } = useLedger();
  const [now] = useState(() => new Date());
  const rows = useMemo(() => data ?? [], [data]);
  const counted = useMemo(() => rows.filter((r) => r.counted), [rows]);
  const total = counted.reduce((s, r) => s + r.amount, 0);

  const months: MonthPoint[] = useMemo(() => {
    const out: MonthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      out.push({
        key,
        label: d.toLocaleDateString("en-ZA", { month: "short" }),
        v: counted.filter((r) => monthKey(new Date(r.date)) === key).reduce((s, r) => s + r.amount, 0),
      });
    }
    return out;
  }, [counted, now]);

  const byGig = useMemo(() => {
    const m = new Map<string, number>();
    counted.forEach((r) => m.set(r.gigTitle, (m.get(r.gigTitle) ?? 0) + r.amount));
    return [...m.entries()].map(([title, v]) => ({ title, v })).sort((a, b) => b.v - a.v);
  }, [counted]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading rows={2} height={200} />;

  return (
    <>
      <section className='bento-dash'>
        <Reveal className='bento-main'>
          <SpotlightCard className='panel income-panel'>
            <div className='income-head'>
              <div className='income-total'>
                <span className='label'>Total income</span>
                <CountUp className='money-xl glow-num' to={total} />
              </div>
              <span className='tag tag-live this-month'>+ {money(months[months.length - 1].v)} this month</span>
            </div>
            <LineChart months={months} />
          </SpotlightCard>
        </Reveal>
        <div className='bento-side'>
          <Reveal delay={90}>
            <SpotlightCard className='panel donut-panel'>
              <Donut items={byGig} total={total} />
            </SpotlightCard>
          </Reveal>
          <Reveal delay={180} className='grow'>
            <SpotlightCard className='panel activity-panel'>
              <span className='label'>Recent activity</span>
              {rows.slice(0, 3).map((b, i) => (
                <div key={b.id} className='activity-row'>
                  <span className={`dot ${i === 0 ? "live-dot" : "idle-dot"}`} />
                  <span className='activity-text'>
                    {(b.client?.username ?? "A client").split(" ")[0]} booked <strong>{shortTitle(b.gigTitle)}</strong>
                  </span>
                  <span className='mono activity-date'>{dshort(b.date)}</span>
                </div>
              ))}
              {!rows.length && <span className='muted'>No bookings yet.</span>}
            </SpotlightCard>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <TaxSummary />
      </Reveal>

      <QuickActions>
        <QuickAction primary to='/my-gigs/new' title='New gig' text='List a new service and set your price' />
        <QuickAction to='/my-gigs' title='My gigs' text='Edit, pause or go live' />
        <QuickAction to='/bookings' title='Bookings' text='Manage orders from clients' />
      </QuickActions>
    </>
  );
};

// Client view: spending summary and quick links
const ClientOverview: React.FC = () => {
  const { data, error, loading, reload } = useLedger();
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading rows={1} height={140} />;
  const rows = data ?? [];
  const spent = rows.filter((r) => r.counted).reduce((s, r) => s + r.amount, 0);
  const open = rows.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status)).length;
  const done = rows.filter((r) => r.status === "completed").length;
  return (
    <>
      <section className='stats' aria-label='Summary'>
        <Reveal className='stat-cell wide'>
          <SpotlightCard className='stat wide'>
            <span className='label'>Total spent</span>
            <CountUp className='money-xl glow-num' to={spent} />
            <span className='sub'>across {rows.filter((r) => r.counted).length} transactions</span>
          </SpotlightCard>
        </Reveal>
        <Reveal className='stat-cell' delay={90}>
          <SpotlightCard className='stat hot'>
            <span className='label'>In progress</span>
            <AnimatedNumber className='big' to={open} />
          </SpotlightCard>
        </Reveal>
        <Reveal className='stat-cell' delay={180}>
          <SpotlightCard className='stat'>
            <span className='label'>Delivered</span>
            <AnimatedNumber className='big' to={done} />
          </SpotlightCard>
        </Reveal>
      </section>
      <QuickActions>
        <QuickAction primary to='/explore' title='Explore gigs' text='Find someone brilliant for the job' />
        <QuickAction to='/bookings' title='My bookings' text='Track orders and receipts' />
      </QuickActions>
    </>
  );
};

const AdminOverview: React.FC = () => (
  <QuickActions>
    <QuickAction primary to='/admin' title='Admin overview' text='Every booking and transaction' />
    <QuickAction to='/explore' title='Explore gigs' text='See what is live on the marketplace' />
  </QuickActions>
);

export const DashboardExtras: React.FC = () => {
  const user = getUser();
  if (!user) return null;
  return (
    <div className='dash-extra'>
      {user.role === "freelancer" ? (
        <FreelancerOverview />
      ) : user.role === "client" ? (
        <ClientOverview />
      ) : (
        <AdminOverview />
      )}
    </div>
  );
};

//Reference List
//React Bits, 2026a. Animated Content. [online] Available at: <https://reactbits.dev/animations/animated-content> [Accessed 11 October 2026].
//React Bits, 2026b. Count Up. [online] Available at: <https://reactbits.dev/text-animations/count-up> [Accessed 11 October 2026].
//React Bits, 2026c. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
