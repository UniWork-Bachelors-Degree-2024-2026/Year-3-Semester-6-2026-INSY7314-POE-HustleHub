import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./ToastContext.ts";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id='toast' role='status' aria-live='polite' className={show ? "show" : ""}>
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
