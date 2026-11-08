import { Link } from "react-router-dom";
import type { PublicUser } from "../models/market.ts";
import { PATTERNS } from "../utils/patterns.ts";

// A person's name that opens their profile. Falls back to plain text when there is no valid id (for example a deleted account).
export function PersonLink({ user, fallback }: { user: PublicUser | null | undefined; fallback: string }) {
  const name = user?.username ?? fallback;
  if (!user || !PATTERNS.objectId.test(user._id)) return <>{name}</>;
  return (
    <Link className='pf-name-link' to={`/u/${user._id}`}>
      {name}
    </Link>
  );
}
