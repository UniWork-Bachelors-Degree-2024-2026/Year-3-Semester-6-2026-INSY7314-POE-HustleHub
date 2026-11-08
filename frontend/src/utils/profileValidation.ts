// Rules for the profile form. Same approach as the rest of the app: clean the text first (sanitize.ts),
// then check it against a whitelist pattern. The server remains the final check for account fields.
import type { ProfileExtras } from "../models/profile.ts";
import { CATEGORIES } from "./categories.ts";
import { sanitizeEmail, sanitizeText, sanitizeUsername } from "./sanitize.ts";
import { validateEmail, validateUsername } from "./validation.ts";
//MDN Web Docs (2026) documents parsing and checking web addresses which assisted this implementation.

export interface ProfileDraft extends ProfileExtras {
  username: string;
  email: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

// Letters (any language), digits and everyday punctuation. No < > { } \ $ | ^ ~ or backtick.
const LINE = /^[\p{L}\p{M}\p{N} .,:;!?&()'’"/+#%@*_-]*$/u;
const BLOCK = /^[\p{L}\p{M}\p{N}\s.,:;!?&()'’"/+#%@*_-]*$/u;
const PLACE = /^[\p{L}\p{M} .,'’-]{2,60}$/u;
const SKILL = /^[\p{L}\p{N} .+#&/-]{2,24}$/u;
const RATE = /^[1-9]\d{0,4}$/;

export const isSkill = (s: string) => SKILL.test(s);

/** Turns "mysite.com" into "https://mysite.com" so people do not have to type the scheme. */
export function normaliseUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

function checkUrl(value: string, label: string, host?: string): string | null {
  if (!value) return null;
  if (value.length > 200) return `${label} is too long (200 characters at most).`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `Enter a valid ${label.toLowerCase()} address.`;
  }
  if (url.protocol !== "https:") return `${label} must start with https://`;
  if (url.username || url.password) return `${label} cannot contain a username or password.`;
  if (!url.hostname.includes(".")) return `Enter a valid ${label.toLowerCase()} address.`;
  if (host && url.hostname !== host && !url.hostname.endsWith(`.${host}`)) return `${label} must be a ${host} address.`;
  return null;
}

/** Returns a link that is safe to put in an href (https only), or "" when it is not. Used for links from other people. */
export function safeUrl(value: string, host?: string): string {
  const url = normaliseUrl(value);
  return url && !checkUrl(url, "Link", host) ? url : "";
}

/** Full clean-up before saving. Never throws, always returns safe strings. */
export function cleanDraft(d: ProfileDraft): ProfileDraft {
  const seen = new Set<string>();
  const skills = d.skills
    .map((s) => sanitizeText(s, { max: 24 }))
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 12);
  return {
    ...d,
    username: sanitizeUsername(d.username).trim(),
    email: sanitizeEmail(d.email),
    headline: sanitizeText(d.headline, { max: 80 }),
    bio: sanitizeText(d.bio, { max: 500, multiline: true }),
    location: sanitizeText(d.location, { max: 60 }),
    website: normaliseUrl(sanitizeText(d.website, { max: 200 })),
    linkedin: normaliseUrl(sanitizeText(d.linkedin, { max: 200 })),
    company: sanitizeText(d.company, { max: 60 }),
    industry: sanitizeText(d.industry, { max: 60 }),
    hourlyRate: d.hourlyRate.replace(/\D/g, "").slice(0, 5),
    skills,
  };
}

export function validateProfile(d: ProfileDraft, role: string): ProfileErrors {
  const e: ProfileErrors = {};
  const u = validateUsername(d.username);
  if (u) e.username = u;
  const m = validateEmail(d.email);
  if (m) e.email = m;

  if (d.headline && !LINE.test(d.headline)) e.headline = "Headline has characters that are not allowed.";
  if (d.bio && !BLOCK.test(d.bio)) e.bio = "Bio has characters that are not allowed.";
  if (d.location && !PLACE.test(d.location)) e.location = "Use letters only, for example Cape Town, South Africa.";
  const site = checkUrl(d.website, "Website");
  if (site) e.website = site;
  const li = checkUrl(d.linkedin, "LinkedIn", "linkedin.com");
  if (li) e.linkedin = li;

  if (role === "freelancer") {
    if (d.skills.some((s) => !SKILL.test(s))) e.skills = "Skills can use letters, numbers and . + # & / - only.";
    if (d.skills.length > 12) e.skills = "Add up to 12 skills.";
    if (d.hourlyRate && !RATE.test(d.hourlyRate)) e.hourlyRate = "Enter a whole rand amount from 1 to 99999.";
  }
  if (role === "client") {
    if (d.company && !LINE.test(d.company)) e.company = "Company name has characters that are not allowed.";
    if (d.industry && !LINE.test(d.industry)) e.industry = "Industry has characters that are not allowed.";
    if (d.hiring.some((h) => !(CATEGORIES as readonly string[]).includes(h)))
      e.hiring = "Pick categories from the list.";
  }
  return e;
}

export interface StrengthItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  tab: "profile" | "work";
}

/** What is still missing from a profile, used for the strength ring and the "next steps" list. */
export function strengthItems(d: ProfileDraft, role: string): StrengthItem[] {
  const common: StrengthItem[] = [
    { key: "avatar", label: "Add a profile photo", weight: 20, done: !!d.avatar, tab: "profile" },
    { key: "headline", label: "Write a headline", weight: 10, done: d.headline.trim().length >= 5, tab: "profile" },
    { key: "bio", label: "Tell people about you", weight: 20, done: d.bio.trim().length >= 40, tab: "profile" },
    { key: "location", label: "Add your location", weight: 10, done: !!d.location.trim(), tab: "profile" },
    {
      key: "links",
      label: "Link your website or LinkedIn",
      weight: 10,
      done: !!(d.website || d.linkedin),
      tab: "profile",
    },
  ];
  if (role === "freelancer")
    return [
      ...common,
      { key: "skills", label: "List at least 3 skills", weight: 15, done: d.skills.length >= 3, tab: "work" },
      { key: "rate", label: "Set your hourly rate", weight: 10, done: !!d.hourlyRate, tab: "work" },
      { key: "exp", label: "Share your experience", weight: 5, done: !!d.experience, tab: "work" },
    ];
  if (role === "client")
    return [
      ...common,
      { key: "company", label: "Add your company", weight: 15, done: !!d.company.trim(), tab: "work" },
      { key: "hiring", label: "Pick what you hire for", weight: 15, done: d.hiring.length > 0, tab: "work" },
    ];
  return common.map((c) => ({ ...c, weight: c.weight * 1.25 }));
}

export const strengthPercent = (items: StrengthItem[]): number => {
  const total = items.reduce((n, i) => n + i.weight, 0);
  const got = items.reduce((n, i) => n + (i.done ? i.weight : 0), 0);
  return total ? Math.min(100, Math.round((got / total) * 100)) : 0;
};

//Reference List
//MDN Web Docs, 2026. URL. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/URL> [Accessed 11 October 2026].
