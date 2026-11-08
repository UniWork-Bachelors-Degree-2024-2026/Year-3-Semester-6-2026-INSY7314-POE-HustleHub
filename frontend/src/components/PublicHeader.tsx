import { Link, NavLink } from "react-router-dom";
import { Brand } from "./Brand.tsx";

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "pub-link active" : "pub-link");

// Top bar for visitors who are not logged in (landing page and public explore page)
export function PublicHeader() {
  return (
    <header className='land-top'>
      <Link to='/' className='pub-brand' aria-label='HustleHub+ home'>
        <Brand />
      </Link>
      <nav className='pub-nav' aria-label='Main'>
        <NavLink to='/' end className={linkClass}>
          Home
        </NavLink>
        <NavLink to='/browse' className={linkClass}>
          Explore gigs
        </NavLink>
      </nav>
      <div className='land-actions'>
        <Link to='/login' className='btn btn-ghost btn-sm'>
          Log in
        </Link>
        <Link to='/register' className='btn btn-sm'>
          Create account
        </Link>
      </div>
    </header>
  );
}
