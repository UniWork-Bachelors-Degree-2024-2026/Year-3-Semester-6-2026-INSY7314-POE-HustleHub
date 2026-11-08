import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LockIcon } from "./Icons.tsx";
import { ClockIcon } from "./MarketIcons.tsx";
import type { Gig } from "../models/market.ts";
import { initials, money } from "../utils/format.ts";

// Shown when a visitor opens a gig: they see a summary but must log in or register to view and book it
export function GateDialog({ gig, onClose }: { gig: Gig; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const owner = gig.freelancer?.username ?? "Freelancer";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className='gate-backdrop' onClick={onClose}>
      <div
        className='gate'
        role='dialog'
        aria-modal='true'
        aria-labelledby='gate-title'
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type='button' className='gate-close' aria-label='Close' onClick={onClose}>
          <svg
            width='18'
            height='18'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            aria-hidden='true'
          >
            <path d='M6 6l12 12M18 6 6 18' />
          </svg>
        </button>

        <span className='gate-lock' aria-hidden='true'>
          <LockIcon size={20} />
        </span>
        <h2 id='gate-title'>Log in to book this gig</h2>
        <p className='gate-sub'>Create a free account or log in to see the full details and make a booking.</p>

        <div className='gate-gig'>
          <span className='gate-cat'>{gig.category}</span>
          <strong>{gig.title}</strong>
          <span className='gate-meta'>
            <span className='gate-owner'>
              <span className='avatar sm'>{initials(owner)}</span>
              {owner}
            </span>
            <span className='gate-days'>
              <ClockIcon /> {gig.deliveryTimeDays} {gig.deliveryTimeDays === 1 ? "day" : "days"}
            </span>
            <span className='mono gate-price'>{money(gig.price)}</span>
          </span>
        </div>

        <div className='gate-actions'>
          <Link to='/register?role=client' className='btn btn-block'>
            Create account
          </Link>
          <Link to='/login' className='btn btn-ghost btn-block'>
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
}
