import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../models/user.ts";
import { ApiError, getProfile } from "../services/api.ts";
import { clearSession, getToken } from "../services/session.ts";
import { BlurText, GradientText, Reveal, ShinyText, SpotlightCard } from "../components/ReactBits.tsx";
import { MailIcon, UserIcon } from "../components/Icons.tsx";
//React Bits (2026a) provides the Animated Content component (Reveal) which assisted this implementation.
//React Bits (2026b) provides the Blur Text component which assisted this implementation.
//React Bits (2026c) provides the Gradient Text component which assisted this implementation.
//React Bits (2026d) provides the Shiny Text component which assisted this implementation.
//React Bits (2026e) provides the Spotlight Card component which assisted this implementation.

const greetingFor = (d: Date) => {
  const h = d.getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    getProfile(token)
      .then(setProfile)
      .catch((err) => {
        // An expired or tampered token gets a 401 from the backend, so send the user back to log in
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
        }
      });
  }, [navigate]);

  return (
    <>
      <section className='dash-hero'>
        <div className='dash-hero-copy'>
          <span className='page-eyebrow'>
            <ShinyText>Dashboard</ShinyText>
          </span>
          <h1 className='dash-title'>
            <BlurText text={greetingFor(now)} />
            <br />
            <GradientText>{profile?.username ?? "..."}</GradientText>
          </h1>
          <p className='dash-lede'>
            {profile?.role === "freelancer"
              ? "Your gigs, bookings and earnings will show up here."
              : "Gigs you book and your receipts will show up here."}
          </p>
        </div>
      </section>

      <div className='info-row'>
        <Reveal delay={0}>
          <SpotlightCard className='panel stat info-card'>
            <span className='info-icon'>
              <MailIcon size={18} />
            </span>
            <span className='label'>Email</span>
            <strong>{profile?.email ?? "-"}</strong>
          </SpotlightCard>
        </Reveal>
        <Reveal delay={90}>
          <SpotlightCard className='panel stat info-card'>
            <span className='info-icon'>
              <UserIcon size={18} />
            </span>
            <span className='label'>Account type</span>
            <strong className='capitalize'>{profile?.role ?? "-"}</strong>
          </SpotlightCard>
        </Reveal>
      </div>
    </>
  );
};

//Reference List
//React Bits, 2026a. Animated Content. [online] Available at: <https://reactbits.dev/animations/animated-content> [Accessed 11 October 2026].
//React Bits, 2026b. Blur Text. [online] Available at: <https://reactbits.dev/text-animations/blur-text> [Accessed 11 October 2026].
//React Bits, 2026c. Gradient Text. [online] Available at: <https://reactbits.dev/text-animations/gradient-text> [Accessed 11 October 2026].
//React Bits, 2026d. Shiny Text. [online] Available at: <https://reactbits.dev/text-animations/shiny-text> [Accessed 11 October 2026].
//React Bits, 2026e. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
