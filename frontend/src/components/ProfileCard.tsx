import type { UserRole } from "../models/user.ts";
import { AVAILABILITY, type ProfileExtras } from "../models/profile.ts";
import { initials } from "../utils/format.ts";
import { GradientText, SpotlightCard } from "./ReactBits.tsx";
import { TiltedCard } from "./ProfileEffects.tsx";
import { BuildingIcon, GlobeIcon, LinkedInIcon, PinIcon } from "./ProfileIcons.tsx";
//React Bits (2026a) provides the Gradient Text component which assisted this implementation.
//React Bits (2026b) provides the Spotlight Card component which assisted this implementation.
//React Bits (2026c) provides the Tilted Card component which assisted this implementation.

interface Props {
  username: string;
  role: UserRole;
  profile: ProfileExtras;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// Live preview of the profile. It updates as the form is edited, before anything is saved.
export function ProfileCard({ username, role, profile: p }: Props) {
  const availability = AVAILABILITY.find((a) => a.value === p.availability);
  const chips = role === "freelancer" ? p.skills : role === "client" ? p.hiring : [];
  const site = host(p.website);

  return (
    <TiltedCard>
      <SpotlightCard className='pf-card' aria-label='Profile preview'>
        <div className={`pf-banner pf-banner-${p.banner}`} aria-hidden='true' />

        <div className='pf-card-body'>
          <div className='pf-av-ring'>
            <span className='pf-av'>
              {p.avatar ? <img src={p.avatar} alt={`${username} profile photo`} /> : <b>{initials(username || "?")}</b>}
            </span>
            {role === "freelancer" && <span className={`pf-av-dot ${p.availability}`} title={availability?.label} />}
          </div>

          <div className='pf-id'>
            <h2 className='pf-name'>
              <GradientText>{username || "Your name"}</GradientText>
            </h2>
            <span className={`role role-${role}`}>{role}</span>
          </div>

          <p className={`pf-headline ${p.headline ? "" : "empty"}`}>
            {p.headline ||
              (role === "freelancer"
                ? "Add a headline so clients know what you do"
                : "Add a headline about what you are building")}
          </p>

          <ul className='pf-meta'>
            {p.location && (
              <li>
                <PinIcon /> {p.location}
              </li>
            )}
            {role === "client" && p.company && (
              <li>
                <BuildingIcon /> {p.company}
              </li>
            )}
            {role === "freelancer" && availability && (
              <li className={`pf-avail ${p.availability}`}>
                <span className='api-dot' aria-hidden='true' /> {availability.label}
              </li>
            )}
          </ul>

          {p.bio && <p className='pf-bio'>{p.bio}</p>}

          {chips.length > 0 && (
            <ul className='pf-chips' aria-label={role === "freelancer" ? "Skills" : "Hires for"}>
              {chips.slice(0, 6).map((c) => (
                <li key={c}>{c}</li>
              ))}
              {chips.length > 6 && <li className='more'>+{chips.length - 6}</li>}
            </ul>
          )}

          {(site || p.linkedin || (role === "freelancer" && p.hourlyRate)) && (
            <div className='pf-card-foot'>
              <span className='pf-links'>
                {site && (
                  <span title={p.website}>
                    <GlobeIcon /> {site}
                  </span>
                )}
                {p.linkedin && (
                  <span title={p.linkedin}>
                    <LinkedInIcon /> LinkedIn
                  </span>
                )}
              </span>
              {role === "freelancer" && p.hourlyRate && (
                <span className='pf-rate'>
                  R{p.hourlyRate}
                  <small>/hr</small>
                </span>
              )}
            </div>
          )}
        </div>
      </SpotlightCard>
    </TiltedCard>
  );
}

//Reference List
//React Bits, 2026a. Gradient Text. [online] Available at: <https://reactbits.dev/text-animations/gradient-text> [Accessed 11 October 2026].
//React Bits, 2026b. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
//React Bits, 2026c. Tilted Card. [online] Available at: <https://reactbits.dev/components/tilted-card> [Accessed 11 October 2026].
