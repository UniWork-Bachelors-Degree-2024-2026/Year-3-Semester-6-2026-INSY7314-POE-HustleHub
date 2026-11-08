import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import LiquidEther from "./LiquidEther.jsx";
import { Brand } from "./Brand.tsx";
import { PublicHeader } from "./PublicHeader.tsx";
import "../landing.css";

// Kept outside the component so the WebGL scene isn't rebuilt on every render.
// Low resolution and fewer solver passes keep the simulation light; it still looks smooth because it's a soft blur of colour.
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

const FEATURES = [
  ["Hire talent in minutes", "Browse gigs by category, compare packages and book the freelancer you want."],
  ["Sell your skills", "List your services, set your own prices and manage every booking in one place."],
  ["Keep track of your money", "Get a receipt for every booking and see what you have spent or earned each month."],
];

export const AuthLayout: React.FC = () => {
  const isRegister = useLocation().pathname === "/register";

  return (
    // Same top bar as the landing and Explore pages, so visitors can get back to them
    <div className='auth-shell'>
      <PublicHeader />
      <div className='auth-page'>
        {canRenderEther && (
          <div className='auth-ether' aria-hidden='true'>
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
        )}

        <div className='auth-card'>
          <section className='auth-story'>
            <Brand />
            <div className='auth-story-copy'>
              <h1 className='auth-headline'>
                Every hustle,
                <br />
                one <span className='accent'>honest</span> ledger.
              </h1>
              <p>
                HustleHub+ connects freelancers with the clients who need them. Every booking is recorded as a
                transaction, so income is always traceable and always yours.
              </p>
            </div>
            <ul className='feature-list'>
              {FEATURES.map(([title, text]) => (
                <li key={title}>
                  <div className='feature'>
                    <span className='dot' />
                    <span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className='auth-form'>
            <nav className={`seg ${isRegister ? "right" : ""}`} aria-label='Account'>
              <span className='seg-pill' aria-hidden='true' />
              <NavLink to='/login' className={({ isActive }) => (isActive ? "seg-link active" : "seg-link")}>
                Log in
              </NavLink>
              <NavLink to='/register' className={({ isActive }) => (isActive ? "seg-link active" : "seg-link")}>
                Create account
              </NavLink>
            </nav>
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
};
