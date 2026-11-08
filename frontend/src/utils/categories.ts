// Categories must match backend/models/gigModel.js exactly.
export const CATEGORIES = [
  "Programming & Tech",
  "Graphic & Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation",
  "Music & Audio",
  "Business",
  "Other",
] as const;

// Each category maps to one of the flat cover-art patterns in index.css.
export const CATEGORY_ART: Record<string, string> = {
  "Programming & Tech": "art-Development",
  "Graphic & Design": "art-Design",
  "Writing & Translation": "art-Writing",
  "Digital Marketing": "art-Marketing",
  "Video & Animation": "art-Photo",
  "Music & Audio": "art-Photo",
  Business: "art-Marketing",
  Other: "art-Development",
};

export const artFor = (category: string | undefined): string => CATEGORY_ART[category ?? ""] ?? "art-Development";

export const GIG_STATUSES = [
  { value: "active", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
] as const;
