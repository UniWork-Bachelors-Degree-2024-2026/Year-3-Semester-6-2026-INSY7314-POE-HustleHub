import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EtherBackground } from "../components/EtherBackground.tsx";
import { FinalCta } from "../components/FinalCta.tsx";
import { GateDialog } from "../components/GateDialog.tsx";
import { GigCarousel } from "../components/GigCarousel.tsx";
import { PublicFooter } from "../components/PublicFooter.tsx";
import { PublicHeader } from "../components/PublicHeader.tsx";
import { RotatingWord } from "../components/LandingEffects.tsx";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { SearchIcon } from "../components/MarketIcons.tsx";
import { CheckIcon } from "../components/Icons.tsx";
import { useApi } from "../hooks/useApi.ts";
import { getGigs } from "../services/marketApi.ts";
import type { Gig } from "../models/market.ts";
import { CATEGORIES } from "../utils/categories.ts";
import { money } from "../utils/format.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { liveSearch, sanitizeSearch } from "../utils/sanitize.ts";
import { trackSpotlight } from "../utils/spotlight.ts";
import { calcTax, TAX_YEAR_LABEL } from "../utils/tax.ts";
import "../marketplace.css";
import "../landing.css";

//React Bits (2026) provides the RotatingWord component which assisted this implementation.
const WORDS = ["freelancers", "designers", "developers", "writers", "marketers"];

//DownloadIcons (2026) provides free icons which assisted this implementation.
const icon = (children: ReactNode) => (
  <svg
    width='22'
    height='22'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {children}
  </svg>
);
const ReceiptIcon = () =>
  icon(
    <>
      <path d='M6 3h12v18l-3-2-3 2-3-2-3 2z' />
      <path d='M9 8h6M9 12h6M9 16h3' />
    </>,
  );
const ChartIcon = () => icon(<path d='M4 20V10M10 20V4M16 20v-7M22 20H2' />);
const GridIcon = () =>
  icon(
    <>
      <rect x='3' y='3' width='7' height='7' rx='1.5' />
      <rect x='14' y='3' width='7' height='7' rx='1.5' />
      <rect x='3' y='14' width='7' height='7' rx='1.5' />
      <rect x='14' y='14' width='7' height='7' rx='1.5' />
    </>,
  );
const Arrow = () => (
  <svg
    width='16'
    height='16'
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

const STEPS = [
  {
    title: "Browse for free",
    text: "Look through every live gig by category, price and delivery time. No account needed.",
  },
  { title: "Create an account", text: "Sign up as a client to hire, or as a freelancer to sell your skills." },
  { title: "Book and get a receipt", text: "Confirm the booking and a transaction record is created for both of you." },
];

const FEATURES = [
  {
    Icon: ReceiptIcon,
    title: "Every booking is on record",
    text: "Each booking creates a transaction linked to the client and the freelancer, so nothing goes missing.",
  },
  {
    Icon: ChartIcon,
    title: "Income and tax at a glance",
    text: "Freelancers see monthly earnings and an estimated tax figure based on the SARS 2026/27 tax brackets.",
  },
  {
    Icon: GridIcon,
    title: "Something for every hustle",
    text: "From programming and design to writing, marketing, video, music and business services.",
  },
];

// Example figures for the freelancer preview. The tax uses the same calculation as the real dashboard.
const EXAMPLE_MONTHS = [
  { m: "Mar", v: 18400 },
  { m: "Apr", v: 28200 },
  { m: "May", v: 23600 },
  { m: "Jun", v: 36800 },
  { m: "Jul", v: 33800 },
  { m: "Aug", v: 42600 },
];
const EXAMPLE_YEAR = EXAMPLE_MONTHS.reduce((t, x) => t + x.v, 0);
const EXAMPLE_MAX = Math.max(...EXAMPLE_MONTHS.map((x) => x.v));

// What a client gets after booking: a receipt
function ReceiptPreview() {
  return (
    <div className='lp-mock' aria-hidden='true'>
      <div className='lp-mock-head'>
        <span className='lp-mock-badge'>
          <ReceiptIcon />
        </span>
        <span className='lp-mock-meta'>
          <strong>Booking receipt</strong>
          <small>Example</small>
        </span>
        <span className='lp-mock-paid'>
          <CheckIcon size={11} /> Paid
        </span>
      </div>
      <dl className='lp-mock-lines'>
        <div>
          <dt>Gig</dt>
          <dd>Logo and brand kit</dd>
        </div>
        <div>
          <dt>Freelancer</dt>
          <dd>Jane Doe</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>5 days</dd>
        </div>
      </dl>
      <div className='lp-mock-total'>
        <span>Total</span>
        <span>{money(2500)}</span>
      </div>
    </div>
  );
}

// What a freelancer sees: monthly income and an estimated tax figure
function IncomePreview() {
  return (
    <div className='lp-mock' aria-hidden='true'>
      <div className='lp-mock-head'>
        <span className='lp-mock-badge'>
          <ChartIcon />
        </span>
        <span className='lp-mock-meta'>
          <strong>Your income</strong>
          <small>Example</small>
        </span>
      </div>
      <div className='lp-bars'>
        {EXAMPLE_MONTHS.map(({ m, v }, i) => (
          <span key={m} className='lp-bar'>
            <span
              className={i === EXAMPLE_MONTHS.length - 1 ? "on" : ""}
              style={{ height: `${(v / EXAMPLE_MAX) * 100}%` }}
            />
            <small>{m}</small>
          </span>
        ))}
      </div>
      <dl className='lp-mock-lines'>
        <div>
          <dt>Earned this year</dt>
          <dd>{money(EXAMPLE_YEAR)}</dd>
        </div>
        <div>
          <dt>Estimated tax ({TAX_YEAR_LABEL})</dt>
          <dd>{money(calcTax(EXAMPLE_YEAR))}</dd>
        </div>
      </dl>
    </div>
  );
}

const AUDIENCES = [
  {
    side: "clients",
    heading: "Hire talent you can trust",
    text: "Find the right person for the job and know exactly what you are paying before you book.",
    points: [
      "Browse gigs across 8 categories",
      "Compare prices and delivery times up front",
      "Book in a few clicks with a simulated checkout",
      "Get a receipt for every booking",
    ],
    cta: "Hire a freelancer",
    Preview: ReceiptPreview,
  },
  {
    side: "freelancers",
    heading: "Turn your skills into income",
    text: "List what you do, set your own price and keep every rand you earn on record.",
    points: [
      "List your services and set your own prices",
      "Manage every booking in one place",
      "See what you have earned each month",
      "Get an estimate of the tax you may owe",
    ],
    cta: "Start selling",
    Preview: IncomePreview,
  },
];

// Public first page: tells visitors what HustleHub+ is, shows a carousel of live gigs,
// and sends them to Explore gigs or to log in / register.
export function LandingPage() {
  const nav = useNavigate();
  const fetcher = useCallback(() => getGigs(), []);
  const { data, error, loading, reload } = useApi(fetcher);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<Gig | null>(null);
  const close = useCallback(() => setPicked(null), []);

  const live = useMemo(
    () => (data ?? []).filter((g) => g.status === "active").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data],
  );
  const countByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of live) m.set(g.category, (m.get(g.category) ?? 0) + 1);
    return m;
  }, [live]);
  const startingFrom = live.length ? Math.min(...live.map((g) => g.price)) : null;

  // Pressing Enter in the search box opens the Explore gigs page with the search filled in
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = sanitizeSearch(draft);
    const q = PATTERNS.search.test(clean) ? clean : "";
    nav(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  };

  return (
    <div className='landing'>
      <EtherBackground />
      <PublicHeader />

      <main className='mk lp'>
        {/* Hero: big type straight over the moving background */}
        <section className='lp-hero'>
          <div className='lp-wrap lp-hero-copy'>
            <h1 className='lp-display'>
              <span className='sr'>Hire talented freelancers.</span>
              {/* Two lines: the fixed words, then the rotating word on its own line */}
              <span className='lp-display-line' aria-hidden='true'>
                Hire talented
              </span>
              {/* React Bits (2026) provides the RotatingWord component which assisted this implementation. */}
              <span className='lp-display-line' aria-hidden='true'>
                <RotatingWord words={WORDS} suffix='.' />
              </span>
            </h1>
            <p className='lp-lede'>
              HustleHub+ connects freelancers with the clients who need them. Freelancers advertise their services,
              clients browse and book them, and every booking is recorded as a transaction, so income is always
              traceable and always yours.
            </p>

            <form className='lp-search' role='search' onSubmit={submit}>
              <span className='lp-search-icon'>
                <SearchIcon />
              </span>
              <label className='sr' htmlFor='land-q'>
                Search gigs
              </label>
              <input
                id='land-q'
                type='search'
                maxLength={80}
                placeholder='What do you need done? e.g. logo'
                autoComplete='off'
                enterKeyHint='search'
                value={draft}
                onChange={(e) => setDraft(liveSearch(e.target.value))}
              />
            </form>

            <div className='lp-hero-ctas'>
              <Link to='/browse' className='btn'>
                Explore all gigs
              </Link>
              <Link to='/register?role=freelancer' className='btn btn-ghost'>
                Sell your skills
              </Link>
            </div>
          </div>

          <dl className='lp-wrap lp-stats'>
            <div>
              <dt>Live gigs</dt>
              <dd>{data ? live.length : "-"}</dd>
            </div>
            <div>
              <dt>Categories with gigs</dt>
              <dd>{data ? countByCategory.size : "-"}</dd>
            </div>
            <div>
              <dt>Gigs start from</dt>
              <dd>{startingFrom !== null ? money(startingFrom) : "-"}</dd>
            </div>
          </dl>
        </section>

        {/* Carousel of every live gig */}
        <section className='lp-band lp-band--tight' aria-labelledby='live-title'>
          {error && (
            <div className='lp-wrap'>
              <ErrorBox error={error} onRetry={reload} />
            </div>
          )}
          {loading && !data && (
            <div className='lp-wrap'>
              <Loading rows={1} height={260} />
            </div>
          )}
          {data &&
            (live.length ? (
              <GigCarousel
                gigs={live}
                onOpen={setPicked}
                label='Live gigs'
                autoplay
                title={
                  <>
                    <h2 id='live-title' className='lp-h2'>
                      Gigs you can book right now
                    </h2>
                    <p className='lp-sub'>Swipe through every live gig, or open one to book it.</p>
                  </>
                }
                action={
                  <Link to='/browse' className='lp-textlink'>
                    Explore all <Arrow />
                  </Link>
                }
              />
            ) : (
              <div className='lp-wrap'>
                <h2 id='live-title' className='lp-h2'>
                  Gigs you can book right now
                </h2>
                <div className='empty'>
                  No gigs are live yet. Create a freelancer account to post the first one.
                  <br />
                  <br />
                  <Link className='btn' to='/register?role=freelancer'>
                    Create account
                  </Link>
                </div>
              </div>
            ))}
        </section>

        {/* Who it is for: two halves, each with a preview of what that person gets */}
        <section className='lp-split' aria-label='Who HustleHub+ is for'>
          {AUDIENCES.map(({ side, heading, text, points, cta, Preview }) => (
            <article key={side} className={`lp-half lp-half--${side}`}>
              <div className='lp-half-copy'>
                <p className='lp-for'>For {side}</p>
                <h2 className='lp-h2'>{heading}</h2>
                <p className='lp-sub'>{text}</p>
                <ul>
                  {points.map((p) => (
                    <li key={p}>
                      <span className='lp-tick'>
                        <CheckIcon size={12} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to={`/register?role=${side === "freelancers" ? "freelancer" : "client"}`} className='btn'>
                  {cta}
                </Link>
              </div>
              <Preview />
            </article>
          ))}
        </section>

        {/* How it works: a real sequence, so it is numbered */}
        <section className='lp-band' aria-labelledby='how-title'>
          <div className='lp-wrap'>
            <h2 id='how-title' className='lp-h2'>
              How it works
            </h2>
            <ol className='lp-steps'>
              {STEPS.map(({ title, text }, i) => (
                <li key={title}>
                  <span className='lp-step-no'>{i + 1}</span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why HustleHub+ */}
        <section className='lp-band lp-band--raised' aria-labelledby='why-title'>
          <div className='lp-wrap'>
            <h2 id='why-title' className='lp-h2 lp-h2--wide'>
              Built around honest money
            </h2>
            <div className='lp-features'>
              {FEATURES.map(({ Icon, title, text }) => (
                <div key={title} className='lp-feature'>
                  <span className='lp-feat-icon'>
                    <Icon />
                  </span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browse by category, with live counts */}
        <section className='lp-band' aria-labelledby='cat-title'>
          <div className='lp-wrap'>
            <h2 id='cat-title' className='lp-h2'>
              Browse by category
            </h2>
            <ul className='lp-cats'>
              {CATEGORIES.map((c) => {
                const n = countByCategory.get(c) ?? 0;
                return (
                  <li key={c}>
                    <Link
                      to={`/browse?cat=${encodeURIComponent(c)}`}
                      className='lp-cat spot'
                      onMouseMove={trackSpotlight}
                    >
                      <span className='lp-cat-name'>{c}</span>
                      <span className='lp-cat-count'>{data ? `${n} live ${n === 1 ? "gig" : "gigs"}` : " "}</span>
                      <span className='lp-cat-arrow'>
                        <Arrow />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <FinalCta
          title='Every hustle, one honest ledger.'
          text='Join free as a client or a freelancer. Every booking you make or take comes with a receipt.'
          points={["Free to join", "Receipt for every booking", "Income and tax estimates"]}
          primary={{ to: "/register", label: "Create a free account" }}
          secondary={{ to: "/browse", label: "Explore gigs" }}
        />

        <PublicFooter />
      </main>

      {picked && <GateDialog gig={picked} onClose={close} />}
    </div>
  );
}

//Reference List
//DownloadIcons, 2026. 89K+ Free Iconsfrom 21 Libraries. [online] Available at: <https://downloadicons.com/> [Accessed 07 October 2026].
//React Bits, 2026. Rotating Text. [online] Available at: <https://reactbits.dev/text-animations/rotating-text> [Accessed 07 October 2026].
