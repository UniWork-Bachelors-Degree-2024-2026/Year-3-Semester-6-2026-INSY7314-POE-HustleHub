import { useEffect, useState } from "react";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Cycles through a list of words with a slide and blur.
 * Every word is stacked in the same spot so the headline never jumps in width.
 * Hidden from screen readers; put the plain sentence in a .sr element next to it.
 */
export function RotatingWord({
  words,
  every = 3000,
  suffix = "",
}: {
  words: string[];
  every?: number;
  /** Text glued to every word (e.g. a full stop) so it never floats away from a short word */
  suffix?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => window.clearInterval(t);
  }, [words.length, every]);
  const prev = (i - 1 + words.length) % words.length;
  return (
    <span className='rotator' aria-hidden='true'>
      {words.map((w, n) => (
        <span key={w} className={n === i ? "on" : n === prev ? "off" : ""}>
          {w}
          {suffix && <span className='rotator-suffix'>{suffix}</span>}
        </span>
      ))}
    </span>
  );
}
