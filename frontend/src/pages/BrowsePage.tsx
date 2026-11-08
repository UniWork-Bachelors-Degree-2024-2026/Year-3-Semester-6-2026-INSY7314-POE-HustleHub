import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getGigs } from "../services/marketApi.ts";
import { useApi } from "../hooks/useApi.ts";
import { GigCard } from "../components/GigCard.tsx";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { SearchIcon } from "../components/MarketIcons.tsx";
import { GradientText, PageHeader } from "../components/ReactBits.tsx";
import { CATEGORIES } from "../utils/categories.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { liveSearch, sanitizeSearch } from "../utils/sanitize.ts";
//React Bits (2026) provides the Gradient Text component which assisted this implementation.

type Sort = "new" | "low" | "high" | "fast";

export function BrowsePage() {
  const nav = useNavigate();
  const fetcher = useCallback(() => getGigs(), []);
  const { data, error, loading, reload } = useApi(fetcher);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  // Filtering happens in the browser so the search text is never used to build a server-side pattern.
  const list = useMemo(() => {
    let l = (data ?? []).filter((g) => g.status === "active");
    if (cat !== "All") l = l.filter((g) => g.category === cat);
    if (q) {
      const needle = q.toLowerCase();
      l = l.filter((g) => `${g.title} ${g.description} ${g.freelancer?.username ?? ""}`.toLowerCase().includes(needle));
    }
    const sorters: Record<Sort, (a: (typeof l)[number], b: (typeof l)[number]) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      fast: (a, b) => a.deliveryTimeDays - b.deliveryTimeDays,
    };
    return [...l].sort(sorters[sort]);
  }, [data, cat, q, sort]);

  // Cleans the typed text and applies it as the active search
  const applySearch = useCallback((value: string) => {
    const clean = sanitizeSearch(value);
    setQ(PATTERNS.search.test(clean) ? clean : "");
  }, []);

  // Searches automatically once the user pauses typing, so the list does not jump on every key
  useEffect(() => {
    const timer = setTimeout(() => applySearch(draft), 250);
    return () => clearTimeout(timer);
  }, [draft, applySearch]);

  // Pressing Enter applies the search straight away instead of waiting
  const submit = (e: FormEvent) => {
    e.preventDefault();
    applySearch(draft);
  };
  const clear = () => {
    setCat("All");
    setQ("");
    setDraft("");
  };

  return (
    <>
      <PageHeader
        eyebrow='Explore'
        title={
          <>
            Find someone <GradientText>brilliant</GradientText> for it.
          </>
        }
      >
        <form className='searchbar browse-search' role='search' onSubmit={submit}>
          <span style={{ color: "var(--dim)", display: "flex" }}>
            <SearchIcon />
          </span>
          <label className='sr' htmlFor='q'>
            Search gigs
          </label>
          <input
            id='q'
            type='search'
            maxLength={80}
            placeholder='Logo, React fix, product shoot...'
            autoComplete='off'
            value={draft}
            onChange={(e) => setDraft(liveSearch(e.target.value))}
          />
        </form>
      </PageHeader>

      <section aria-label='Filters' className='browse-filters'>
        <div className='browse-chips'>
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} className='chip' aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <label htmlFor='sort' style={{ fontSize: 14, color: "var(--muted)" }}>
            Sort
          </label>
          <select
            id='sort'
            className='field'
            style={{ width: "auto", minHeight: 44, background: "var(--surface)" }}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value='new'>Newest</option>
            <option value='low'>Price: low to high</option>
            <option value='high'>Price: high to low</option>
            <option value='fast'>Fastest delivery</option>
          </select>
        </div>
      </section>

      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Loading rows={2} height={220} />}
      {data && (
        <>
          <span className='label'>
            {list.length} {list.length === 1 ? "gig" : "gigs"}
            {cat === "All" ? " available" : ` in ${cat}`}
            {q ? ` matching "${q}"` : ""}
          </span>
          {list.length ? (
            <section className='grid-gigs' aria-label='Gigs'>
              {list.map((g, i) => (
                <GigCard
                  key={g._id}
                  index={i}
                  title={g.title}
                  category={g.category}
                  price={g.price}
                  days={g.deliveryTimeDays}
                  owner={g.freelancer?.username ?? "Freelancer"}
                  onOpen={() => nav(`/gigs/${g._id}`)}
                />
              ))}
            </section>
          ) : (
            <div className='empty'>
              No gigs match that search. Try a different word or clear the filters.
              <br />
              <br />
              <button className='btn btn-ghost' onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

//Reference List
//React Bits, 2026. Gradient Text. [online] Available at: <https://reactbits.dev/text-animations/gradient-text> [Accessed 11 October 2026].
