// Page title for each route, shown in the browser tab and history.
const TITLES: [RegExp, string][] = [
  [/^\/dashboard/, "Dashboard"],
  [/^\/explore/, "Explore gigs"],
  [/^\/browse/, "Browse gigs"],
  [/^\/gigs\//, "Gig details"],
  [/^\/bookings/, "Bookings"],
  [/^\/my-gigs\/new/, "New gig"],
  [/^\/my-gigs\/.+\/edit/, "Edit gig"],
  [/^\/my-gigs/, "My gigs"],
  [/^\/profile/, "Your profile"],
  [/^\/u\//, "Member profile"],
  [/^\/admin/, "Admin"],
  [/^\/login/, "Log in"],
  [/^\/register/, "Create account"],
];

export const titleFor = (pathname: string): string => {
  const hit = TITLES.find(([re]) => re.test(pathname));
  return hit ? `${hit[1]} | HustleHub+` : "HustleHub+";
};
