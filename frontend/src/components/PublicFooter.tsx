import { Link } from "react-router-dom";
import { Brand } from "./Brand.tsx";

// Footer for the public pages (landing and Explore gigs)
export function PublicFooter() {
  return (
    <footer className='lp-footer'>
      <div className='lp-wrap lp-footer-grid'>
        <div className='lp-footer-brand'>
          <Brand />
          <p>The secure freelance marketplace where every booking is on record.</p>
        </div>
        <nav aria-label='Marketplace'>
          <strong>Marketplace</strong>
          <Link to='/'>Home</Link>
          <Link to='/browse'>Explore gigs</Link>
        </nav>
        <nav aria-label='Your account'>
          <strong>Your account</strong>
          <Link to='/login'>Log in</Link>
          <Link to='/register'>Create account</Link>
        </nav>
      </div>
      <div className='lp-wrap lp-footer-base'>
        <span>© 2026 HustleHub+</span>
      </div>
    </footer>
  );
}
