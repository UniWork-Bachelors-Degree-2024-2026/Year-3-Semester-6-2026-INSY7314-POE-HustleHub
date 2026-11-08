import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

//Mozilla Developer (2026) demonstrates the Window: scrollTo() method which assisted this implementation.
// Jumps back to the top of the page whenever the route (path) changes.
// Without this, React Router keeps the old scroll position, so links like
// "Explore all" open the next page halfway down.
export function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
//Reference List
//Mozilla Developer, 2026. Window: scrollTo() method. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo> [Accessed 07 October 2026].
