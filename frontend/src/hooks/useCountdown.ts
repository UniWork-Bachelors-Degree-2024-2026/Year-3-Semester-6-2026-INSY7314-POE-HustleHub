import { useEffect, useState } from "react";

// Counts down from a number of seconds to zero, used to pace the "resend code" button.
export function useCountdown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  return { seconds, start: setSeconds };
}
