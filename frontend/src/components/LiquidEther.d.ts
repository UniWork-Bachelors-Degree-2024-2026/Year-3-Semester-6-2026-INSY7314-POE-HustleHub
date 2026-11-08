//React Bits (2026) demonstrates a liquid ether background which assisted this implementation.
import type { CSSProperties, FC } from "react";

// Types for the plain-JS LiquidEther component so it can be used from TSX
export interface LiquidEtherProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  /** Size of the idle auto-animation blob; defaults to cursorSize */
  autoCursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
  backgroundColor?: string;
  lightMode?: boolean;
  style?: CSSProperties;
  className?: string;
}

declare const LiquidEther: FC<LiquidEtherProps>;
export default LiquidEther;

//Reference List
//React Bits, 2026. Liquid Ether. [online] Available at: <https://reactbits.dev/backgrounds/liquid-ether> [Accessed 07 October 2026].
