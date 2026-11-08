import { useLedger } from "../hooks/useLedger.ts";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { StatusTag } from "../components/StatusTag.tsx";
import { AnimatedNumber, PageHeader, SpotlightCard } from "../components/ReactBits.tsx";
import { AuditLog } from "../components/AuditLog.tsx";
import { dlong, money } from "../utils/format.ts";

export function AdminPage() {
  const { data, error, loading, reload } = useLedger();
  if (loading && !data)
    return (
      <>
        <h1 className='h-xl'>Admin overview</h1>
        <Loading rows={2} height={140} />
      </>
    );
  if (error)
    return (
      <>
        <h1 className='h-xl'>Admin overview</h1>
        <ErrorBox error={error} onRetry={reload} />
      </>
    );
  const rows = data ?? [];
  const volume = rows.filter((r) => r.counted).reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader eyebrow='All activity' title='Admin overview' />
      <section className='stats'>
        <SpotlightCard className='stat wide'>
          <span className='label'>Transaction volume</span>
          <AnimatedNumber className='money-xl glow-num' to={volume} format={money} />
        </SpotlightCard>
        <SpotlightCard className='stat hot'>
          <span className='label'>Bookings</span>
          <AnimatedNumber className='big' to={rows.length} />
        </SpotlightCard>
      </section>
      {rows.length === 0 ? (
        <div className='empty'>No bookings have been made yet.</div>
      ) : (
        <div className='tablebox'>
          <table>
            <thead>
              <tr>
                <th scope='col'>Reference</th>
                <th scope='col'>Client</th>
                <th scope='col'>Freelancer</th>
                <th scope='col'>Gig</th>
                <th scope='col'>Date</th>
                <th scope='col'>Status</th>
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
                  <td>{r.client?.username ?? "Unknown"}</td>
                  <td>{r.freelancer?.username ?? "Unknown"}</td>
                  <td style={{ minWidth: 200 }}>{r.gigTitle}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{dlong(r.date)}</td>
                  <td>
                    <StatusTag status={r.status} />
                  </td>
                  <td className={`num ${r.counted ? "" : "struck"}`}>{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AuditLog />
    </>
  );
}
