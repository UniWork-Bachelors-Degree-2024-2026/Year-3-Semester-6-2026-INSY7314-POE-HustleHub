import type { CSSProperties, PointerEvent } from "react";
import { artFor } from "../utils/categories.ts";
import { initials, money } from "../utils/format.ts";
import { trackSpotlight } from "../utils/spotlight.ts";
//React Bits (2026) provides the Spotlight Card component which assisted this implementation.

interface Props {
  title: string;
  category: string;
  price: number;
  days: number;
  owner: string;
  onOpen?: () => void;
  index?: number;
  preview?: boolean;
}

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function GigCard({ title, category, price, days, owner, onOpen, index = 0, preview = false }: Props) {
  const tilt = (e: PointerEvent<HTMLElement>) => {
    trackSpotlight(e);
    if (preview || reduceMotion() || e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-4px)`;
  };
  const reset = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  };

  const body = (
    <>
      <span className={`cover ${artFor(category)}`}>
        <span className='cover-tag'>{category}</span>
      </span>
      <span className='gig-body'>
        <span className='gig-title'>{title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className='avatar sm'>{initials(owner)}</span>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{owner}</span>
        </span>
        <span className='gig-foot'>
          <span className='mono' style={{ fontSize: 12, color: "var(--muted)" }}>
            {days} {days === 1 ? "day" : "days"}
          </span>
          <span className='mono' style={{ fontSize: 18 }}>
            {money(price)}
          </span>
        </span>
      </span>
    </>
  );

  if (preview) {
    return (
      <div
        className='gig'
        aria-hidden='true'
        style={{ cursor: "default", borderColor: "var(--blue)", animation: "none" }}
      >
        {body}
      </div>
    );
  }
  const style: CSSProperties = { animationDelay: `${index * 50}ms` };
  return (
    <button
      type='button'
      className='gig fx-spot'
      onClick={onOpen}
      onPointerMove={tilt}
      onPointerLeave={reset}
      style={style}
    >
      {body}
    </button>
  );
}

//Reference List
//React Bits, 2026. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
