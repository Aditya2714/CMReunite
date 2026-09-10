const test = require("node:test");
const assert = require("node:assert/strict");
const { parseAlumniQuery, scoreProfile } = require("../src/controllers/assistantController");

test("assistant extracts purpose, year and searchable terms", () => {
  const intent = parseAlumniQuery("Find a Python mentor in Bengaluru from 2020");
  assert.equal(intent.mode, "mentor");
  assert.deepEqual(intent.years, [2020]);
  assert.ok(intent.keywords.includes("python"));
  assert.ok(intent.keywords.includes("bengaluru"));
});

test("assistant recognises referral intent", () => {
  assert.equal(parseAlumniQuery("I need a job referral at Microsoft").mode, "referral");
});

test("profile scoring returns transparent field evidence", () => {
  const ranked = scoreProfile(
    { skills: ["Python"], company: "Acme", location: "Bengaluru", endYear: 2020 },
    { keywords: ["python", "bengaluru"], years: [2020], mode: "mentor" }
  );
  assert.ok(ranked.score >= 10);
  assert.ok(ranked.matches.includes("skills: python"));
  assert.ok(ranked.matches.includes("batch: 2020"));
});
