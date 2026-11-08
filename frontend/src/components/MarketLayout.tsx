import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { EtherBackground } from "./EtherBackground.tsx";
import { NavBar } from "./NavBar.tsx";
import { ToastProvider } from "./ToastProvider.tsx";
import "../marketplace.css";
import "../App.css";
//React Bits (2026) demonstrates a liquid ether background which assisted this implementation.

// Shared layout for the logged in pages, so the background keeps running between pages
export const MarketLayout: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <ToastProvider>
      <div className='app'>
        <div className='app-aurora' aria-hidden='true' />
        <EtherBackground className='app-ether' />
        <div className='app-veil' aria-hidden='true' />
        <a className='skip-link' href='#main'>
          Skip to content
        </a>
        <NavBar />
        {/* the key replays the fade in on each page */}
        <main id='main' tabIndex={-1} key={pathname} className='page mk app-page'>
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
};

//Reference List
//React Bits, 2026. Liquid Ether. [online] Available at: <https://reactbits.dev/backgrounds/liquid-ether> [Accessed 11 October 2026].
