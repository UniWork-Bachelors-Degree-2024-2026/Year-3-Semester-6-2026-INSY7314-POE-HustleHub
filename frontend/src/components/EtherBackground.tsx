//React Bits (2026) demonstrates a liquid ether background which assisted this implementation.
import React from "react";
import LiquidEther from "./LiquidEther.jsx";

// Same moving background and settings as the login/register layout.
// Kept outside the component so the WebGL scene isn't rebuilt on every render.
const ETHER_COLORS = ["#1D4ED8", "#2563EB", "#38BDF8"];

// three.js throws without WebGL, which would blank the whole page, so fall back to the plain background
const canRenderEther = (() => {
  try {
    const canvas = document.createElement("canvas");
    const hasGL = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    return hasGL && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
})();

// className lets the logged in pages use a dimmer wrapper
export const EtherBackground: React.FC<{ className?: string }> = ({ className = "auth-ether" }) =>
  canRenderEther ? (
    <div className={className} aria-hidden='true'>
      <LiquidEther
        colors={ETHER_COLORS}
        mouseForce={30}
        cursorSize={30}
        autoCursorSize={58}
        resolution={0.25}
        iterationsPoisson={12}
        BFECC={false}
        autoDemo
        autoSpeed={0.45}
        autoIntensity={1.5}
        autoResumeDelay={1500}
        takeoverDuration={0.7}
      />
    </div>
  ) : null;

//Reference List
//React Bits, 2026. Liquid Ether. [online] Available at: <https://reactbits.dev/backgrounds/liquid-ether> [Accessed 07 October 2026].
