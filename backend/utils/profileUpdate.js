// Builds the profile update from the fields the profile model knows, so nothing else can reach the database.
// A value is only copied when it is plain text, true or false, or a list of plain text,
// which keeps a query operator such as { "$ne": "" } out of the update (CodeQL, 2026d).
const PROFILE_FIELDS = Object.freeze([
  "visible",
  "avatar",
  "banner",
  "availability",
  "experience",
  "category",
  "headline",
  "bio",
  "company",
  "industry",
  "location",
  "website",
  "linkedin",
  "hourlyRate",
  "skills",
  "hiring",
]);

const buildProfileUpdate = (body) => {
  const update = {};
  if (body === null || typeof body !== "object") {
    return update;
  }

  for (const field of PROFILE_FIELDS) {
    const value = body[field];

    if (typeof value === "string" || typeof value === "boolean") {
      update[field] = value;
    } else if (Array.isArray(value)) {
      update[field] = value.filter((item) => typeof item === "string");
    }
  }

  return update;
};

module.exports = { PROFILE_FIELDS, buildProfileUpdate };

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
