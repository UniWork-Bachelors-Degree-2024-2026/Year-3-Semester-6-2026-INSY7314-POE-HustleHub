import { Link } from "react-router-dom";
import { CheckIcon } from "./Icons.tsx";
import { trackSpotlight } from "../utils/spotlight.ts";
//React Bits (2026) provides the Spotlight Card component which assisted this implementation.

interface Action {
  to: string;
  label: string;
}

interface Props {
  title: string;
  text: string;
  points?: string[];
  primary: Action;
  secondary: Action;
}

// Closing call to action at the bottom of the public pages:
// a dark card with a small light running around its border and a spotlight that follows the mouse
export function FinalCta({ title, text, points = [], primary, secondary }: Props) {
  return (
    <section className='lp-final'>
      <div className='lp-wrap'>
        <div className='lp-final-card spot' onMouseMove={trackSpotlight}>
          <div className='lp-final-copy'>
            <h2 className='lp-final-title'>{title}</h2>
            <p className='lp-final-text'>{text}</p>
            {points.length > 0 && (
              <ul className='lp-final-points'>
                {points.map((p) => (
                  <li key={p}>
                    <span className='lp-final-tick'>
                      <CheckIcon size={12} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className='lp-final-ctas'>
            <Link to={primary.to} className='btn'>
              {primary.label}
            </Link>
            <Link to={secondary.to} className='btn btn-ghost'>
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

//Reference List
//React Bits, 2026. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
