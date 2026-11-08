const test = require("node:test");
const assert = require("node:assert/strict");

const { PROFILE_FIELDS, buildProfileUpdate } = require("../utils/profileUpdate.js");

test("text, boolean and list fields are copied as they are", () => {
  const body = {
    visible: false,
    headline: "Full-stack developer",
    skills: ["React", "Node"],
    hiring: ["Web Development"],
  };
  assert.deepEqual(buildProfileUpdate(body), body);
});

test("an empty string is kept, because it clears a field", () => {
  assert.deepEqual(buildProfileUpdate({ bio: "", website: "" }), { bio: "", website: "" });
});

test("fields the profile does not have are left out", () => {
  const update = buildProfileUpdate({
    headline: "Hi",
    role: "admin",
    user: "someone",
    password: "x",
  });
  assert.deepEqual(update, { headline: "Hi" });
});

test("a query operator in place of text is left out", () => {
  const update = buildProfileUpdate({ headline: { $ne: "" }, bio: { $gt: "" }, visible: "yes" });
  assert.deepEqual(update, { visible: "yes" });
  assert.equal(Object.keys(update).includes("headline"), false);
});

test("a list keeps only its text items", () => {
  const update = buildProfileUpdate({ skills: ["React", { $ne: 1 }, 42, "Node", null] });
  assert.deepEqual(update, { skills: ["React", "Node"] });
});

test("a number or a missing field is left out", () => {
  assert.deepEqual(buildProfileUpdate({ hourlyRate: 500 }), {});
  assert.deepEqual(buildProfileUpdate({}), {});
});

test("a body that is not an object gives an empty update", () => {
  assert.deepEqual(buildProfileUpdate(null), {});
  assert.deepEqual(buildProfileUpdate(undefined), {});
  assert.deepEqual(buildProfileUpdate("text"), {});
});

test("the list of fields matches the profile model", () => {
  const Profile = require("../models/profileModel.js");
  const modelFields = Object.keys(Profile.schema.paths).filter(
    (name) => !["_id", "__v", "user", "createdAt", "updatedAt"].includes(name)
  );
  assert.deepEqual([...PROFILE_FIELDS].sort(), modelFields.sort());
});
