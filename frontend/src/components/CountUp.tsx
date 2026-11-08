import { useEffect, useState } from "react";
import { money } from "../utils/format.ts";

export function CountUp({ to, className }: { to: number; className?: string }) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const [v, setV] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1300);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, reduce]);

  return <span className={className}>{money(reduce ? to : v)}</span>;
}
