import { money, shortTitle } from "../utils/format.ts";

export interface MonthPoint {
  key: string;
  label: string;
  v: number;
}

export function LineChart({ months }: { months: MonthPoint[] }) {
  const W = 600,
    H = 180,
    padX = 14,
    top = 14,
    bottom = 22;
  const max = Math.max(1000, Math.ceil(Math.max(...months.map((m) => m.v)) / 2000) * 2000);
  const x = (i: number) => padX + i * ((W - padX * 2) / (months.length - 1));
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const pts = months.map((m, i) => [x(i), y(m.v)] as const);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C ${mx} ${pts[i - 1][1]}, ${mx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
  }
  const last = pts[pts.length - 1];
  const area = `${d} L ${last[0]} ${H - bottom} L ${pts[0][0]} ${H - bottom} Z`;
  const label = `Monthly income: ${months.map((m) => `${m.label} ${money(m.v)}`).join(", ")}`;
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role='img'
          aria-label={label}
          style={{ width: "100%", minWidth: 320, height: "auto", display: "block" }}
        >
          <defs>
            <linearGradient id='inc-area' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='#38BDF8' stopOpacity='0.38' />
              <stop offset='100%' stopColor='#2563EB' stopOpacity='0' />
            </linearGradient>
            <linearGradient id='inc-line' x1='0' y1='0' x2='1' y2='0'>
              <stop offset='0%' stopColor='#2563EB' />
              <stop offset='100%' stopColor='#38BDF8' />
            </linearGradient>
            <filter id='inc-glow' x='-10%' y='-30%' width='120%' height='160%'>
              <feGaussianBlur stdDeviation='4' result='b' />
              <feMerge>
                <feMergeNode in='b' />
                <feMergeNode in='SourceGraphic' />
              </feMerge>
            </filter>
          </defs>
          {[0, 0.5, 1].map((f) => {
            const v = max * f;
            return (
              <g key={f}>
                <line x1='0' x2={W} y1={y(v)} y2={y(v)} stroke='rgba(255,255,255,0.07)' strokeDasharray='3 6' />
                <text
                  x={W}
                  y={y(v) - 5}
                  textAnchor='end'
                  fill='#6E6A64'
                  fontFamily='JetBrains Mono, monospace'
                  fontSize='11'
                >
                  {v ? `R${v / 1000}k` : ""}
                </text>
              </g>
            );
          })}
          <path className='fade-in' d={area} fill='url(#inc-area)' />
          <path
            className='line-anim'
            d={d}
            fill='none'
            stroke='url(#inc-line)'
            strokeWidth='3.5'
            strokeLinecap='round'
            filter='url(#inc-glow)'
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={i === pts.length - 1 ? 6 : 3.5}
              fill={i === pts.length - 1 ? "#38BDF8" : "#2563EB"}
              stroke='#0b0b0d'
              strokeWidth='2'
              className={i === pts.length - 1 ? "chart-pulse" : undefined}
            />
          ))}
        </svg>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${months.length},minmax(0,1fr))`,
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 12,
          color: "var(--dim)",
        }}
      >
        {months.map((m) => (
          <span key={m.key}>
            {m.label}
            <br />
            <span style={{ color: "var(--soft)" }}>R{(m.v / 1000).toFixed(1)}k</span>
          </span>
        ))}
      </div>
    </>
  );
}

export interface Slice {
  title: string;
  v: number;
}

const COLORS = ["#2563EB", "#38BDF8", "#22C55E", "#A8A39B"];

export function Donut({ items, total }: { items: Slice[]; total: number }) {
  if (!total)
    return <span style={{ color: "var(--muted)", fontSize: 14 }}>Income by gig appears after your first booking.</span>;
  const top = items.slice(0, 3);
  const rest = items.slice(3).reduce((s, x) => s + x.v, 0);
  if (rest) top.push({ title: "Other", v: rest });
  const segs = top.map((x, i) => {
    const before = top.slice(0, i).reduce((a, y) => a + (y.v / total) * 100, 0);
    const pct = (x.v / total) * 100;
    const len = Math.max(0, pct - 0.8);
    return (
      <circle
        key={x.title}
        className='seg-anim'
        cx='21'
        cy='21'
        r='15.9155'
        fill='none'
        stroke={COLORS[i]}
        strokeWidth='5'
        strokeDasharray={`${len} ${100 - len}`}
        strokeDashoffset={-before}
      />
    );
  });
  const label = `Income by gig: ${top.map((x) => `${shortTitle(x.title)} ${Math.round((x.v / total) * 100)}%`).join(", ")}`;
  return (
    <>
      <svg
        width='120'
        height='120'
        viewBox='0 0 42 42'
        role='img'
        aria-label={label}
        className='donut-svg'
        style={{ flex: "none", transform: "rotate(-90deg)" }}
      >
        <circle cx='21' cy='21' r='15.9155' fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='5' />
        {segs}
      </svg>
      <div style={{ flex: "1 1 140px", minWidth: 0, display: "flex", flexDirection: "column", gap: 9, fontSize: 14 }}>
        <span className='label'>Income by gig</span>
        {top.map((x, i) => (
          <span key={x.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i], flex: "none" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shortTitle(x.title)}
            </span>
            <span className='mono' style={{ marginLeft: "auto", color: "var(--soft)" }}>
              {Math.round((x.v / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </>
  );
}
