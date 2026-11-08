import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EtherBackground } from "../components/EtherBackground.tsx";
import { FinalCta } from "../components/FinalCta.tsx";
import { GateDialog } from "../components/GateDialog.tsx";
import { GigCard } from "../components/GigCard.tsx";
import { GigCarousel } from "../components/GigCarousel.tsx";
import { PublicFooter } from "../components/PublicFooter.tsx";
import { PublicHeader } from "../components/PublicHeader.tsx";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { SearchIcon } from "../components/MarketIcons.tsx";
import { useApi } from "../hooks/useApi.ts";
import { getGigs } from "../services/marketApi.ts";
import type { Gig } from "../models/market.ts";
import { CATEGORIES } from "../utils/categories.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { liveSearch, sanitizeSearch } from "../utils/sanitize.ts";
import "../marketplace.css";
import "../landing.css";
//React Bits (2026) demonstrates a liquid ether background which assisted this implementation.

type Sort = "new" | "low" | "high" | "fast";

const SORTERS: Record<Sort, (a: Gig, b: Gig) => number> = {
  new: (a, b) => b.createdAt.localeCompare(a.createdAt),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
  fast: (a, b) => a.deliveryTimeDays - b.deliveryTimeDays,
};

// Values from the address bar are untrusted: clean them and only accept known categories and safe search text
const cleanQuery = (raw: string | null): string => {
  const clean = sanitizeSearch(raw ?? "");
  return PATTERNS.search.test(clean) ? clean : "";
};
const cleanCategory = (raw: string | null): string =>
  raw && (CATEGORIES as readonly string[]).includes(raw) ? raw : "All";

const gigWord = (n: number) => `${n} ${n === 1 ? "gig" : "gigs"}`;

// Public explore page. With no search or category picked, gigs are shown as one carousel per category.
// Searching or picking a category switches to a grid of matching gigs. Opening a gig asks the visitor to log in.
export function ExploreGigsPage() {
  const [params, setParams] = useSearchParams();
  const fetcher = useCallback(() => getGigs(), []);
  const { data, error, loading, reload } = useApi(fetcher);
  const q = cleanQuery(params.get("q"));
  const cat = cleanCategory(params.get("cat"));
  const [draft, setDraft] = useState(q);
  const [sort, setSort] = useState<Sort>("new");
  const [picked, setPicked] = useState<Gig | null>(null);
  const close = useCallback(() => setPicked(null), []);

  // Search and category live in the URL so links from the landing page (and the back button) work
  const setFilters = (next: { q?: string; cat?: string }) => {
    const nq = next.q ?? q;
    const nc = next.cat ?? cat;
    const p: Record<string, string> = {};
    if (nq) p.q = nq;
    if (nc !== "All") p.cat = nc;
    setParams(p, { replace: true });
  };

  const live = useMemo(() => (data ?? []).filter((g) => g.status === "active").sort(SORTERS[sort]), [data, sort]);
  const filtering = Boolean(q) || cat !== "All";

  // Filtering happens in the browser so the search text is never used to build a server-side pattern
  const results = useMemo(() => {
    let l = live;
    if (cat !== "All") l = l.filter((g) => g.category === cat);
    if (q) {
      const needle = q.toLowerCase();
      l = l.filter((g) => `${g.title} ${g.description} ${g.freelancer?.username ?? ""}`.toLowerCase().includes(needle));
    }
    return l;
  }, [live, cat, q]);

  const rows = useMemo(
    () =>
      CATEGORIES.map((c) => ({ category: c, gigs: live.filter((g) => g.category === c) })).filter((r) => r.gigs.length),
    [live],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ q: cleanQuery(draft) });
  };
  const clear = () => {
    setDraft("");
    setParams({}, { replace: true });
  };

  return (
    <div className='landing'>
      <EtherBackground />
      <PublicHeader />

      <main className='mk lp'>
        <section className='lp-hero lp-hero--compact'>
          <div className='lp-wrap lp-explore-hero'>
            <div>
              <h1 className='lp-display lp-display--md'>Explore gigs</h1>
              <p className='lp-lede'>
                Browse every live gig for free. When you find the right one, log in or create an account to book it.
              </p>
            </div>
            <form className='lp-search' role='search' onSubmit={submit}>
              <span className='lp-search-icon'>
                <SearchIcon />
              </span>
              <label className='sr' htmlFor='explore-q'>
                Search gigs
              </label>
              <input
                id='explore-q'
                type='search'
                maxLength={80}
                placeholder='What do you need done? e.g. logo'
                autoComplete='off'
                value={draft}
                enterKeyHint='search'
                onChange={(e) => {
                  // Results update as you type; no search button needed
                  const v = liveSearch(e.target.value);
                  setDraft(v);
                  setFilters({ q: cleanQuery(v) });
                }}
              />
            </form>
          </div>
        </section>

        {/* Filters stay in reach while scrolling */}
        <div className='lp-filterbar'>
          <div className='lp-wrap lp-filter-inner'>
            <div className='lp-chips' role='group' aria-label='Filter by category'>
              {["All", ...CATEGORIES].map((c) => (
                <button
                  key={c}
                  type='button'
                  className='chip'
                  aria-pressed={cat === c}
                  onClick={() => setFilters({ cat: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className='lp-band lp-band--tight' aria-labelledby='results-title'>
          <div className='lp-wrap lp-results-head'>
            <h2 id='results-title' className='lp-count'>
              {data
                ? `${gigWord(filtering ? results.length : live.length)}${cat === "All" ? " available" : ` in ${cat}`}${
                    q ? ` matching "${q}"` : ""
                  }`
                : "Loading gigs"}
            </h2>
            <div className='lp-results-tools'>
              {filtering && data && (
                <button type='button' className='lp-textlink' onClick={clear}>
                  Clear filters
                </button>
              )}
              <div className='lp-sort'>
                <label htmlFor='explore-sort'>Sort</label>
                <select
                  id='explore-sort'
                  className='field'
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                >
                  <option value='new'>Newest</option>
                  <option value='low'>Price: low to high</option>
                  <option value='high'>Price: high to low</option>
                  <option value='fast'>Fastest delivery</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className='lp-wrap'>
              <ErrorBox error={error} onRetry={reload} />
            </div>
          )}
          {loading && !data && (
            <div className='lp-wrap'>
              <Loading rows={2} height={220} />
            </div>
          )}

          {/* Browsing: one carousel per category that has live gigs */}
          {data && !filtering && live.length > 0 && (
            <div className='lp-rows'>
              {rows.map(({ category, gigs }) => (
                <GigCarousel
                  key={category}
                  gigs={gigs}
                  onOpen={setPicked}
                  label={`${category} gigs`}
                  title={
                    <h3 className='lp-h3'>
                      {category} <span className='lp-h3-count'>{gigWord(gigs.length)}</span>
                    </h3>
                  }
                  action={
                    <button type='button' className='lp-textlink' onClick={() => setFilters({ cat: category })}>
                      See all
                    </button>
                  }
                />
              ))}
            </div>
          )}

          {/* Searching or filtering: a grid of matches */}
          {data && filtering && results.length > 0 && (
            <div className='lp-wrap'>
              <div className='grid-gigs' aria-label='Gigs'>
                {results.map((g, i) => (
                  <GigCard
                    key={g._id}
                    index={i}
                    title={g.title}
                    category={g.category}
                    price={g.price}
                    days={g.deliveryTimeDays}
                    owner={g.freelancer?.username ?? "Freelancer"}
                    onOpen={() => setPicked(g)}
                  />
                ))}
              </div>
            </div>
          )}

          {data && (filtering ? results.length === 0 : live.length === 0) && (
            <div className='lp-wrap'>
              <div className='empty'>
                {live.length
                  ? "No gigs match that search. Try a different word or clear the filters."
                  : "No gigs are live yet. Create a freelancer account to post the first one."}
                <br />
                <br />
                {live.length ? (
                  <button type='button' className='btn btn-ghost' onClick={clear}>
                    Clear filters
                  </button>
                ) : (
                  <Link className='btn' to='/register'>
                    Create account
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        <FinalCta
          title='Found something you like?'
          text='Create a free account to book it. Every booking comes with a receipt.'
          points={["Free to join", "Book in a few clicks", "Receipt for every booking"]}
          primary={{ to: "/register?role=client", label: "Create a free account" }}
          secondary={{ to: "/login", label: "Log in" }}
        />

        <PublicFooter />
      </main>

      {picked && <GateDialog gig={picked} onClose={close} />}
    </div>
  );
}

//Reference List
//React Bits, 2026. Liquid Ether. [online] Available at: <https://reactbits.dev/backgrounds/liquid-ether> [Accessed 11 October 2026].
