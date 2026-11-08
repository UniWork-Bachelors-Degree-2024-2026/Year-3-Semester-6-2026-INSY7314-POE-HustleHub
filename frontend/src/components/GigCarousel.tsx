//World Wide Web Consortium (2025) demonstrates an auto-rotating image carousel example with buttons for slide control which assisted this implementation.
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { GigCard } from "./GigCard.tsx";
import type { Gig } from "../models/market.ts";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

interface Props {
  gigs: Gig[];
  onOpen: (gig: Gig) => void;
  /** Accessible name for the carousel, e.g. "Live gigs" or "Programming & Tech gigs". Must be unique on the page. */
  label: string;
  /** Heading shown above the cards on the left */
  title: ReactNode;
  /** Optional extra controls shown next to the arrows (e.g. a "See all" link) */
  action?: ReactNode;
  /** Move to the next card on its own every few seconds (pauses on hover, focus and touch) */
  autoplay?: boolean;
}

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
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
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

// Full-width, swipeable row of gig cards with previous / next buttons
export function GigCarousel({ gigs, onOpen, label, title, action, autoplay = false }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  // Moves by roughly one screen of cards
  const step = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const cardWidth = card ? card.offsetWidth + 20 : 320;
    const perView = Math.max(1, Math.floor((el.clientWidth - 80) / cardWidth));
    el.scrollBy?.({ left: dir * cardWidth * perView, behavior: "smooth" });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, gigs.length]);

  useEffect(() => {
    if (!autoplay || reduceMotion() || gigs.length < 2) return;
    const t = window.setInterval(() => {
      const el = track.current;
      if (!el || paused.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo?.({ left: 0, behavior: "smooth" });
      else step(1);
    }, 4000);
    return () => window.clearInterval(t);
  }, [autoplay, gigs.length, step]);

  // Lets desktop users click-and-drag the row with a mouse (touch already swipes natively)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      el.classList.add("is-dragging");
      el.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    const el = track.current;
    if (!drag.current) return;
    el?.classList.remove("is-dragging");
    // Keep the "moved" flag until the click event so a drag does not open a gig
    window.setTimeout(() => (drag.current = null), 0);
  };
  const swallowClickAfterDrag = (e: MouseEvent) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);

  return (
    <div className='lp-carousel' onPointerEnter={pause} onPointerLeave={resume} onFocus={pause} onBlur={resume}>
      <div className='lp-wrap lp-carousel-head'>
        <div className='lp-carousel-title'>{title}</div>
        <div className='lp-carousel-tools'>
          {action}
          {/* Arrows only show when there are more gigs than fit on screen */}
          {!(atStart && atEnd) && (
            <>
              <button
                type='button'
                className='lp-arrow'
                aria-label={`Previous ${label}`}
                disabled={atStart}
                onClick={() => step(-1)}
              >
                <Arrow dir='left' />
              </button>
              <button
                type='button'
                className='lp-arrow'
                aria-label={`Next ${label}`}
                disabled={atEnd}
                onClick={() => step(1)}
              >
                <Arrow dir='right' />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={track}
        className='lp-track'
        role='region'
        aria-roledescription='carousel'
        aria-label={label}
        onScroll={update}
        onTouchStart={pause}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={swallowClickAfterDrag}
        onDragStart={(e) => e.preventDefault()}
      >
        {gigs.map((g, i) => (
          <div key={g._id} className='lp-slide' aria-label={`${i + 1} of ${gigs.length}`}>
            <GigCard
              index={i}
              title={g.title}
              category={g.category}
              price={g.price}
              days={g.deliveryTimeDays}
              owner={g.freelancer?.username ?? "Freelancer"}
              onOpen={() => onOpen(g)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
//Reference List
//World Wide Web Consortium, 2025. Auto-Rotating Image Carousel Example with Buttons for Slide Control. [online] Available at: <https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-1-prev-next/> [Accessed 07 October 2026].
