import type { MouseEvent } from "react";
//React Bits (2026) provides the SpotlightCard component which assisted this implementation.
/**
 * Spotlight hover effect (based on React Bits' SpotlightCard).
 * Stores the mouse position on the element so its ::before glow can follow the cursor.
 * Use on any element with the "spot" class.
 */
export const trackSpotlight = (e: MouseEvent<HTMLElement>) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
  el.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
};
//Reference List
//React Bits, 2026. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 07 October 2026].
