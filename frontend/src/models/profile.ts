// Extra profile details kept on this device (the API only stores username, email and role).

import type { UserRole } from "./user.ts";

export type Availability = "available" | "busy" | "away";
export type BannerId = "ocean" | "aurora" | "midnight" | "glacier";

export interface ProfileExtras {
  /** Cropped photo as a data URL, or "" for the initials fallback */
  avatar: string;
  banner: BannerId;
  headline: string;
  bio: string;
  location: string;
  website: string;
  linkedin: string;
  // Freelancer details
  category: string;
  skills: string[];
  hourlyRate: string;
  experience: string;
  availability: Availability;
  // Client details
  company: string;
  industry: string;
  hiring: string[];
  // Notification choices
  notifyBookings: boolean;
  notifyNews: boolean;
  /** Lets other members open this profile. Email is never shared either way. */
  visible: boolean;
}

/** Facts the server works out itself (not typed in by the user). */
export interface PublicStats {
  completedBookings?: number;
  memberSince?: string;
}

/** What GET /api/users/:id/profile returns. `profile` is null when the person is hidden or has shared nothing yet. */
export interface PublicProfile {
  _id: string;
  username: string;
  role: UserRole;
  stats?: PublicStats;
  profile?: Partial<ProfileExtras> | null;
}

export const BANNERS: { id: BannerId; label: string }[] = [
  { id: "ocean", label: "Ocean" },
  { id: "aurora", label: "Aurora" },
  { id: "midnight", label: "Midnight" },
  { id: "glacier", label: "Glacier" },
];

export const AVAILABILITY: { value: Availability; label: string }[] = [
  { value: "available", label: "Open to work" },
  { value: "busy", label: "Booked up" },
  { value: "away", label: "Away" },
];

export const EXPERIENCE: { value: string; label: string }[] = [
  { value: "<1", label: "Under 1 year" },
  { value: "1-3", label: "1 to 3 years" },
  { value: "3-5", label: "3 to 5 years" },
  { value: "5-10", label: "5 to 10 years" },
  { value: "10+", label: "10+ years" },
];

export const SKILL_SUGGESTIONS: Record<string, string[]> = {
  "Programming & Tech": ["React", "TypeScript", "Node.js", "Python", "APIs", "Mobile apps"],
  "Graphic & Design": ["Branding", "Logo design", "UI design", "Illustration", "Figma", "Packaging"],
  "Writing & Translation": ["Copywriting", "Editing", "Blogging", "Translation", "Proofreading", "SEO writing"],
  "Digital Marketing": ["SEO", "Social media", "Email campaigns", "Ads", "Analytics", "Content plans"],
  "Video & Animation": ["Video editing", "Motion graphics", "Reels", "Animation", "Colour grading", "Subtitles"],
  "Music & Audio": ["Mixing", "Mastering", "Voice over", "Podcasts", "Jingles", "Sound design"],
  Business: ["Business plans", "Bookkeeping", "Research", "Pitch decks", "Virtual assistant", "Strategy"],
  Other: ["Tutoring", "Photography", "Event help", "Data capture", "Admin", "Consulting"],
};

export const EMPTY_PROFILE: ProfileExtras = {
  avatar: "",
  banner: "ocean",
  headline: "",
  bio: "",
  location: "",
  website: "",
  linkedin: "",
  category: "",
  skills: [],
  hourlyRate: "",
  experience: "",
  availability: "available",
  company: "",
  industry: "",
  hiring: [],
  notifyBookings: true,
  notifyNews: false,
  visible: true,
};
