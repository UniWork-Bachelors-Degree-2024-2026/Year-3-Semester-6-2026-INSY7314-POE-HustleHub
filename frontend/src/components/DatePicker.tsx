// World Wide Web Consortium (2025) demonstrates a date picker dialog example which assisted this implementation.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PATTERNS } from "../utils/patterns.ts";

// Themed replacement for <input type="date">, whose pop-up calendar is drawn by the browser and cannot be styled.
// Values are plain "YYYY-MM-DD" strings, the same format the native input and the booking API use.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Builds the date at local midnight so the day never shifts with the time zone.
const fromISO = (iso: string): Date | null => {
  if (!PATTERNS.isoDate.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
};

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
};

// Six rows of seven days, starting on the Monday on or before the 1st of the month.
const monthGrid = (month: Date): Date[] => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

//DownloadIcons (2026) provides free icons which assisted this implementation.
const display = (iso: string) => {
  const d = fromISO(iso);
  return d ? d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "";
};

const CalendarIcon = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <rect x='3' y='5' width='18' height='16' rx='3' />
    <path d='M3 10h18M8 3v4M16 3v4' />
  </svg>
);

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
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
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

interface DatePickerProps {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  /** Earliest day that can be picked, as YYYY-MM-DD. */
  min?: string;
  placeholder?: string;
  invalid?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Choose a date",
  invalid = false,
}: DatePickerProps) {
  const today = toISO(new Date());
  const [open, setOpen] = useState(false);
  // The day that has keyboard focus inside the calendar
  const [cursor, setCursor] = useState<Date>(() => fromISO(value) ?? fromISO(min ?? "") ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const isDisabled = (iso: string) => Boolean(min && iso < min);

  const openPicker = () => {
    setCursor(fromISO(value) ?? fromISO(min ?? "") ?? new Date());
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const pick = (iso: string) => {
    if (isDisabled(iso)) return;
    onChange(iso);
    close();
  };

  // Closes when the user clicks anywhere outside the picker
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keeps keyboard focus on the highlighted day as it moves
  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${toISO(cursor)}"]`)?.focus();
  }, [open, cursor]);

  const onGridKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
      Home: () => addDays(cursor, -((cursor.getDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((cursor.getDay() + 6) % 7)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setCursor(moves[e.key]());
    }
  };

  const onPopoverKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const month = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthLabel = month.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  // Stepping back is pointless when the whole previous month is before the minimum
  const prevMonthEnd = toISO(new Date(month.getFullYear(), month.getMonth(), 0));
  const canGoBack = !min || prevMonthEnd >= min;

  return (
    <div className='dp' ref={wrapRef}>
      <button
        ref={triggerRef}
        id={id}
        type='button'
        className={`field dp-trigger ${invalid ? "bad" : ""}`}
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => (open ? close() : openPicker())}
      >
        <span className={value ? "dp-value" : "dp-placeholder"}>{value ? display(value) : placeholder}</span>
        <span className='dp-icon'>
          <CalendarIcon />
        </span>
      </button>

      {open && (
        <div className='dp-pop' role='dialog' aria-modal='false' aria-labelledby={titleId} onKeyDown={onPopoverKey}>
          <div className='dp-head'>
            <button
              type='button'
              className='dp-nav'
              aria-label='Previous month'
              disabled={!canGoBack}
              onClick={() => setCursor(addMonths(cursor, -1))}
            >
              <Chevron dir='left' />
            </button>
            <span id={titleId} className='dp-title' aria-live='polite'>
              {monthLabel}
            </span>
            <button
              type='button'
              className='dp-nav'
              aria-label='Next month'
              onClick={() => setCursor(addMonths(cursor, 1))}
            >
              <Chevron dir='right' />
            </button>
          </div>

          <div className='dp-grid' role='group' aria-labelledby={titleId} ref={gridRef} onKeyDown={onGridKey}>
            {WEEKDAYS.map((w) => (
              <span key={w} className='dp-weekday' aria-hidden='true'>
                {w}
              </span>
            ))}
            {monthGrid(month).map((day) => {
              const iso = toISO(day);
              const outside = day.getMonth() !== month.getMonth();
              const disabled = isDisabled(iso);
              const selected = iso === value;
              const focused = iso === toISO(cursor);
              const classes = ["dp-day", outside && "outside", selected && "selected", iso === today && "today"]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={iso}
                  type='button'
                  data-iso={iso}
                  className={classes}
                  disabled={disabled}
                  tabIndex={focused ? 0 : -1}
                  aria-pressed={selected}
                  aria-current={iso === today ? "date" : undefined}
                  aria-label={day.toLocaleDateString("en-ZA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  onClick={() => pick(iso)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className='dp-foot'>
            <button
              type='button'
              className='dp-link'
              onClick={() => {
                onChange("");
                close();
              }}
            >
              Clear
            </button>
            <button type='button' className='dp-link' disabled={isDisabled(today)} onClick={() => pick(today)}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

//Reference List
//DownloadIcons, 2026. 89K+ Free Iconsfrom 21 Libraries. [online] Available at: <https://downloadicons.com/> [Accessed 07 October 2026].
//World Wide Web Consortium, 2025. Date Picker Dialog Example. [online] Available at: <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/> [Accessed 07 October 2026].
