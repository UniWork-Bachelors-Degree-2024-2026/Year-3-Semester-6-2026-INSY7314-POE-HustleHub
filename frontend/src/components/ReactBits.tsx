import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { trackSpotlight } from "../utils/spotlight.ts";
//React Bits (2026a) provides the Animated Content component (Reveal) which assisted this implementation.
//React Bits (2026b) provides the Blur Text component which assisted this implementation.
//React Bits (2026c) provides the Count Up component (AnimatedNumber) which assisted this implementation.
//React Bits (2026d) provides the Gradient Text component which assisted this implementation.
//React Bits (2026e) provides the Shiny Text component which assisted this implementation.
//React Bits (2026f) provides the Spotlight Card component which assisted this implementation.

// Effects based on React Bits (https://reactbits.dev), written by hand so no extra package is needed.
// The styles are in app.css.

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// true once the element has scrolled into view
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined" || reduceMotion());
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

export function SpotlightCard({
  className = "",
  children,
  onMouseMove,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      {...rest}
      className={`fx-spot ${className}`}
      onMouseMove={(e) => {
        trackSpotlight(e);
        onMouseMove?.(e);
      }}
    >
      {children}
    </div>
  );
}

export function BlurText({ text, className = "", delay = 70 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref);
  const words = text.split(" ");
  return (
    <span ref={ref} className={`fx-blur ${seen ? "in" : ""} ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} aria-hidden='true' style={{ transitionDelay: `${i * delay}ms` }}>
          {w}
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

export function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`fx-gradient ${className}`}>{children}</span>;
}

export function ShinyText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`fx-shiny ${className}`}>{children}</span>;
}

export function AnimatedNumber({
  to,
  format = (n: number) => String(n),
  className,
}: {
  to: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [v, setV] = useState(() => (reduceMotion() ? to : 0));
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className={className}>{format(reduceMotion() ? to : v)}</span>;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  return (
    <div
      {...rest}
      ref={ref}
      className={`fx-reveal ${seen ? "in" : ""} ${className}`}
      style={{ ...rest.style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className='page-head'>
      <div className='page-head-copy'>
        {eyebrow && <span className='page-eyebrow'>{eyebrow}</span>}
        <h1 className='h-xl page-title'>{title}</h1>
      </div>
      {children && <div className='page-head-actions'>{children}</div>}
    </header>
  );
}

//Reference List
//React Bits, 2026a. Animated Content. [online] Available at: <https://reactbits.dev/animations/animated-content> [Accessed 11 October 2026].
//React Bits, 2026b. Blur Text. [online] Available at: <https://reactbits.dev/text-animations/blur-text> [Accessed 11 October 2026].
//React Bits, 2026c. Count Up. [online] Available at: <https://reactbits.dev/text-animations/count-up> [Accessed 11 October 2026].
//React Bits, 2026d. Gradient Text. [online] Available at: <https://reactbits.dev/text-animations/gradient-text> [Accessed 11 October 2026].
//React Bits, 2026e. Shiny Text. [online] Available at: <https://reactbits.dev/text-animations/shiny-text> [Accessed 11 October 2026].
//React Bits, 2026f. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
