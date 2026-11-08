import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { titleFor } from "../utils/pageTitle.ts";
//MDN Web Docs (2026a) documents detecting when the browser is offline which assisted this implementation.
//MDN Web Docs (2026b) documents running animations on each frame which assisted this implementation.

// Small app-wide touches that make the site feel finished:
//  - a thin progress line at the top that follows the scroll
//  - a "scrolled" flag so the nav bar can deepen its shadow
//  - a page title for every route (shows in tabs, history and screen readers)
//  - a quiet banner when the connection drops

export function PageChrome() {
  const { pathname } = useLocation();
  const bar = useRef<HTMLDivElement>(null);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${p})`;
        bar.current.style.opacity = p > 0 ? "1" : "0";
      }
      document.documentElement.toggleAttribute("data-scrolled", y > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      document.documentElement.removeAttribute("data-scrolled");
    };
  }, [pathname]);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  return (
    <>
      <div className='scroll-progress' ref={bar} aria-hidden='true' />
      {offline && (
        <div className='offline-bar' role='status'>
          You are offline. We will reconnect as soon as your internet is back.
        </div>
      )}
    </>
  );
}

//Reference List
//MDN Web Docs, 2026a. Navigator: onLine property. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine> [Accessed 11 October 2026].
//MDN Web Docs, 2026b. Window: requestAnimationFrame() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame> [Accessed 11 October 2026].
