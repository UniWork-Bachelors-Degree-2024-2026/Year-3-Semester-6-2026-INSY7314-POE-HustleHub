import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
//MDN Web Docs (2026) documents running animations on each frame which assisted this implementation.
//React Bits (2026a) provides the Click Spark component which assisted this implementation.
//React Bits (2026b) provides the Tilted Card component which assisted this implementation.

// More effects based on React Bits (https://reactbits.dev): TiltedCard, ClickSpark and a progress ring.
// Written by hand, like the ones in ReactBits.tsx, so no extra package is needed. Styles are in profile.css.

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Card that leans towards the cursor with a soft glare (React Bits TiltedCard). */
export function TiltedCard({
  children,
  max = 8,
  className = "",
}: {
  children: ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduceMotion() || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };

  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className={`fx-tilt-wrap ${className}`} onPointerMove={move} onPointerLeave={leave}>
      <div className='fx-tilt' ref={ref}>
        {children}
        <span className='fx-tilt-glare' aria-hidden='true' />
      </div>
    </div>
  );
}

/** Sparks fly out from the children each time `fire` goes up (React Bits ClickSpark). */
export function SparkBurst({ fire, children }: { fire: number; children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire || reduceMotion()) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height } = canvas;
    const count = 14;
    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / 650);
      const ease = 1 - Math.pow(1 - p, 3);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineWidth = 2.5;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const from = 18 + ease * 52;
        const to = from + (1 - p) * 16;
        ctx.strokeStyle = i % 2 ? `rgba(56,189,248,${1 - p})` : `rgba(37,99,235,${1 - p})`;
        ctx.beginPath();
        ctx.moveTo(width / 2 + Math.cos(a) * from, height / 2 + Math.sin(a) * from * 0.8);
        ctx.lineTo(width / 2 + Math.cos(a) * to, height / 2 + Math.sin(a) * to * 0.8);
        ctx.stroke();
      }
      if (p < 1) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fire]);

  return (
    <span className='fx-spark'>
      <canvas ref={canvasRef} className='fx-spark-canvas' width={300} height={180} aria-hidden='true' />
      {children}
    </span>
  );
}

/** Circular progress meter with the blue to cyan gradient. */
export function ProgressRing({ value, size = 104, stroke = 9 }: { value: number; size?: number; stroke?: number }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className='fx-ring'
      style={{ width: size, height: size }}
      role='img'
      aria-label={`Profile strength ${value} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden='true'>
        <defs>
          <linearGradient id={id} x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor='#2563eb' />
            <stop offset='100%' stopColor='#38bdf8' />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill='none' stroke='rgba(255,255,255,0.08)' strokeWidth={stroke} />
        <circle
          className='fx-ring-bar'
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap='round'
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className='fx-ring-text'>
        {value}
        <small>%</small>
      </span>
    </div>
  );
}

//Reference List
//MDN Web Docs, 2026. Window: requestAnimationFrame() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame> [Accessed 11 October 2026].
//React Bits, 2026a. Click Spark. [online] Available at: <https://reactbits.dev/animations/click-spark> [Accessed 11 October 2026].
//React Bits, 2026b. Tilted Card. [online] Available at: <https://reactbits.dev/components/tilted-card> [Accessed 11 October 2026].
