import React, { useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "./Brand.tsx";
import { RoleLinks } from "./RoleLinks.tsx";
import { clearSession } from "../services/session.ts";
import { useAvatar, useSessionUser } from "../hooks/useProfile.ts";
import { initials } from "../utils/format.ts";
import "../profile.css";

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSessionUser();
  const avatar = useAvatar(user?._id);
  const linksRef = useRef<HTMLDivElement>(null);

  // moves the highlight pill under the active link
  useEffect(() => {
    const box = linksRef.current;
    if (!box) return;
    const place = () => {
      const active = box.querySelector<HTMLElement>(".nav-link.active");
      if (!active) {
        box.style.setProperty("--pill-w", "0px");
        return;
      }
      box.style.setProperty("--pill-x", `${active.offsetLeft}px`);
      box.style.setProperty("--pill-w", `${active.offsetWidth}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname, user?.role]);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className='app-top'>
      <nav className='app-nav' aria-label='Main'>
        <Link to='/dashboard' className='app-brand' aria-label='HustleHub+ dashboard'>
          <Brand />
        </Link>
        <div className='nav-links' ref={linksRef}>
          <span className='nav-pill' aria-hidden='true' />
          <NavLink to='/dashboard' className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Dashboard
          </NavLink>
          <RoleLinks role={user?.role} />
        </div>
        <div className='nav-right'>
          {user && <span className={`role role-${user.role}`}>{user.role}</span>}
          {user && (
            <Link
              to='/profile'
              className={`avatar avatar-link ${pathname === "/profile" ? "is-active" : ""}`}
              title='Your profile'
              aria-label={`Your profile (${user.username})`}
            >
              {avatar ? (
                <img src={avatar} alt='' />
              ) : (
                initials(user.username) || user.username.slice(0, 2).toUpperCase()
              )}
            </Link>
          )}
          <button className='btn btn-ghost btn-sm' onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
};
