import {
  BANNERS,
  AVAILABILITY,
  EMPTY_PROFILE,
  EXPERIENCE,
  type Availability,
  type BannerId,
  type ProfileExtras,
} from "../models/profile.ts";
import { CATEGORIES } from "../utils/categories.ts";
import { sanitizeText } from "../utils/sanitize.ts";
//MDN Web Docs (2026) documents browser storage for saved profile details which assisted this implementation.

// Profile extras live in localStorage under one key per user, so each account on this browser keeps its own.
// The login token is NOT stored here (it stays in sessionStorage, see session.ts).

const keyFor = (userId: string) => `hh_profile_${userId}`;
const EVENT = "hh:profile";

/** Only a cropped JPEG, PNG or WebP data URL is ever accepted as a photo. Anything else is dropped. */
const AVATAR_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const AVATAR_MAX_LENGTH = 400_000;

export const isSafeAvatar = (value: unknown): value is string =>
  typeof value === "string" && value.length <= AVATAR_MAX_LENGTH && AVATAR_PATTERN.test(value);

const text = (v: unknown, max: number, multiline = false) =>
  typeof v === "string" ? sanitizeText(v, { max, multiline }) : "";

const list = (v: unknown, max: number, itemMax: number): string[] =>
  Array.isArray(v)
    ? v
        .map((i) => text(i, itemMax))
        .filter(Boolean)
        .slice(0, max)
    : [];

/** Storage can be edited by hand, so every field is checked and cleaned again when it is read back. */
export function normaliseProfile(raw: unknown): ProfileExtras {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const banner = BANNERS.some((b) => b.id === r.banner) ? (r.banner as BannerId) : EMPTY_PROFILE.banner;
  const availability = AVAILABILITY.some((a) => a.value === r.availability)
    ? (r.availability as Availability)
    : EMPTY_PROFILE.availability;
  const category = (CATEGORIES as readonly string[]).includes(r.category as string) ? (r.category as string) : "";
  const experience = EXPERIENCE.some((e) => e.value === r.experience) ? (r.experience as string) : "";
  const hiring = list(r.hiring, 4, 40).filter((c) => (CATEGORIES as readonly string[]).includes(c));

  return {
    avatar: isSafeAvatar(r.avatar) ? r.avatar : "",
    banner,
    headline: text(r.headline, 80),
    bio: text(r.bio, 500, true),
    location: text(r.location, 60),
    website: text(r.website, 200),
    linkedin: text(r.linkedin, 200),
    category,
    skills: list(r.skills, 12, 24),
    hourlyRate: typeof r.hourlyRate === "string" ? r.hourlyRate.replace(/\D/g, "").slice(0, 5) : "",
    experience,
    availability,
    company: text(r.company, 60),
    industry: text(r.industry, 60),
    hiring,
    notifyBookings: typeof r.notifyBookings === "boolean" ? r.notifyBookings : EMPTY_PROFILE.notifyBookings,
    notifyNews: typeof r.notifyNews === "boolean" ? r.notifyNews : EMPTY_PROFILE.notifyNews,
    visible: typeof r.visible === "boolean" ? r.visible : EMPTY_PROFILE.visible,
  };
}

function rawFor(userId: string): string | null {
  try {
    return localStorage.getItem(keyFor(userId));
  } catch {
    return null;
  }
}

export function loadProfile(userId: string): ProfileExtras {
  const raw = rawFor(userId);
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    return normaliseProfile(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

/** Returns false when the browser refuses to store it (private mode or storage full). */
export function saveProfile(userId: string, profile: ProfileExtras): boolean {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(normaliseProfile(profile)));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function clearProfile(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* nothing stored, nothing to clear */
  }
  window.dispatchEvent(new Event(EVENT));
}

// ---- Small subscription helpers so the nav bar avatar updates the moment a photo is saved ----

export function subscribeProfile(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const avatarCache = new Map<string, { raw: string | null; avatar: string }>();

export function readAvatar(userId?: string): string {
  if (!userId) return "";
  const raw = rawFor(userId);
  const hit = avatarCache.get(userId);
  if (hit && hit.raw === raw) return hit.avatar;
  const avatar = raw ? loadProfile(userId).avatar : "";
  avatarCache.set(userId, { raw, avatar });
  return avatar;
}

//Reference List
//MDN Web Docs, 2026. Window: localStorage property. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage> [Accessed 11 October 2026].
