import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { UserRole } from "../models/user.ts";

// Extra nav links for the marketplace pages, shown next to the existing Dashboard link.
// Uses the same nav-link classes as NavBar so the bar looks identical.
const LINKS: Record<UserRole, { to: string; label: string; match: string[] }[]> = {
  client: [
    { to: "/explore", label: "Explore", match: ["/explore", "/gigs"] },
    { to: "/bookings", label: "Bookings", match: ["/bookings"] },
  ],
  freelancer: [
    { to: "/my-gigs", label: "My gigs", match: ["/my-gigs"] },
    { to: "/bookings", label: "Bookings", match: ["/bookings"] },
  ],
  admin: [
    { to: "/explore", label: "Explore", match: ["/explore", "/gigs"] },
    { to: "/admin", label: "Admin", match: ["/admin"] },
  ],
};

export const RoleLinks: React.FC<{ role?: UserRole }> = ({ role }) => {
  const { pathname } = useLocation();
  if (!role) return null;
  return (
    <>
      {LINKS[role].map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={
            l.match.some((m) => pathname === m || pathname.startsWith(m + "/")) ? "nav-link active" : "nav-link"
          }
        >
          {l.label}
        </Link>
      ))}
    </>
  );
};
