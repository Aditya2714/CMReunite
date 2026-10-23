const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "directory-tests-only-secret";
const app = require("../app");
const User = require("../src/models/user");
const Alumni = require("../src/models/alumniModel");
const { seedDirectoryFixtures } = require("./helpers/directoryFixtures");
const { SENIORITY_OPTIONS } = require("../src/services/directoryService");
let mongo, fixtures;
const token = (user) => `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
const search = (query = {}, user = fixtures.viewer) => request(app).get("/alumni").set("Authorization", token(user)).query(query);
const names = (result) => result.body.data.alumni.map((profile) => profile.firstName);
beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); fixtures = await seedDirectoryFixtures(); });
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
test("directory and options require authentication and expose five career groups", async () => {
  expect((await request(app).get("/alumni")).status).toBe(401);
  expect((await request(app).get("/alumni/directory-options")).status).toBe(401);
  const result = await request(app).get("/alumni/directory-options").set("Authorization", token(fixtures.viewer));
  expect(result.status).toBe(200); expect(result.body.data.seniorityOptions).toEqual(SENIORITY_OPTIONS);
});
test("server filtering finds VP matches beyond the original first 100 records", async () => {
  const initial = await search(); expect(initial.body.data.alumni).toHaveLength(100);
  expect(names(initial)).not.toContain("Mira");
  const result = await search({ company: "microsoft", designation: "VP", seniority: "vp" });
  expect(result.status).toBe(200);
  expect(names(result).sort()).toEqual(["Mira", "Vikram", "Veda", "Sana", "Evan", "YoungVP", "Network"].sort());
});
test.each(["VP", "Vice President", "Vice-President", "V.P."])("designation alias %s returns the same visible current VP profiles", async (designation) => {
  const result = await search({ designation, company: "Microsoft" });
  expect(result.status).toBe(200); expect(names(result)).toContain("Mira"); expect(names(result)).toContain("YoungVP");
  expect(names(result)).not.toContain("History"); expect(names(result)).not.toContain("Private");
});
test.each([["SVP", ["Sana"]], ["EVP", ["Evan"]], ["CEO", ["Ada"]], ["Chief Executive Officer", ["Ada"]], ["CTO", ["Ari"]]])("executive designation alias %s matches %j", async (designation, expected) => {
  expect(names(await search({ designation }))).toEqual(expected);
});
test.each([["senior", ["Sara", "Priya"]], ["manager", ["Max"]], ["director", ["Hema", "Dee"]], ["executive", ["Ari", "Ada"]]])("career group %s is title-based and mutually exclusive", async (seniority, expected) => {
  expect(names(await search({ seniority })).sort()).toEqual(expected.sort());
});
test("graduation batch and career seniority are independent and combine with other filters", async () => {
  expect(names(await search({ company: "Microsoft", seniority: "vp", batch: "2020", branch: "cse", location: "bengaluru" }))).toEqual(["Vikram"]);
  expect(names(await search({ company: "Microsoft", seniority: "vp", batch: "2025" }))).toEqual(["YoungVP"]);
  expect(names(await search({ batch: "1990" }))).toEqual(["OldBatch"]);
  expect(names(await search({ batch: "1990", seniority: "senior" }))).toEqual([]);
  const title = (await search({ keyword: "Mira" })).body.data.alumni[0]; expect(title.careerSeniorityLabel).toBe("VP-level");
});
test("company/title filtering uses current employment, never combines historical roles", async () => {
  expect(names(await search({ company: "Microsoft", designation: "VP" }))).not.toContain("History");
  expect(names(await search({ keyword: "History" }))).toEqual(["History"]);
  expect(names(await search({ company: "Other Co", designation: "Engineer" }))).toContain("History");
});
test("privacy, blocking, approval and orphan-account exclusions happen before counts and pagination", async () => {
  const orphan = await Alumni.collection.insertOne({ firstName: "Orphan", user: new mongoose.Types.ObjectId(), company: "Microsoft", designation: "VP" });
  const first = await search({ company: "Microsoft", seniority: "vp", limit: "2", page: "1" });
  expect(first.body.data.pagination).toMatchObject({ total: 7, pages: 4, page: 1, limit: 2 });
  const found = [];
  for (let page = 1; page <= 4; page++) found.push(...names(await search({ company: "Microsoft", seniority: "vp", limit: "2", page: String(page) })));
  expect(new Set(found).size).toBe(7);
  for (const name of ["Private", "Unconnected", "Blocked", "BlocksViewer", "Pending", "Orphan"]) expect(found).not.toContain(name);
  await Alumni.collection.deleteOne({ _id: orphan.insertedId });
});
test("contacts stay redacted unless public; account internals are never returned", async () => {
  const hidden = (await search({ keyword: "Mira" })).body.data.alumni[0];
  expect(hidden.email).toBe(""); expect(hidden.mobileNumber).toBeUndefined(); expect(hidden.account).toBeUndefined(); expect(hidden.password).toBeUndefined();
  const visible = (await search({ keyword: "PublicContact" })).body.data.alumni[0];
  expect(visible.email).toBe("publiccontact@example.com"); expect(visible.mobileNumber).toBe(9999999999);
  expect(names(await search({ keyword: "mira@example.com" }))).toEqual([]);
});
test("regex metacharacters are literal, not executable patterns", async () => {
  expect(names(await search({ company: "C++ Labs (R&D)", designation: "C++" }))).toEqual(["RegexLiteral"]);
  expect(names(await search({ keyword: ".*" }))).toEqual([]);
  expect((await search({ company: "[" })).status).toBe(200);
});
test.each([{ seniority: "boss" }, { company: { $ne: "" } }, { designation: ["VP", "CEO"] }, { company: "x".repeat(201) }, { batch: "old" }, { batch: "20" }, { page: "0" }, { page: "-1" }, { page: "1.5" }, { page: "Infinity" }, { limit: "101" }, { limit: "0" }])("invalid filters return 400: %j", async (query) => { expect((await search(query)).status).toBe(400); });
test("empty result and stable pagination have accurate totals", async () => {
  const missing = await search({ company: "No Such Company" }); expect(missing.body.data.pagination.total).toBe(0); expect(missing.body.data.alumni).toEqual([]);
  const first = await search({ company: "Filler Co", limit: "12", page: "1" });
  const second = await search({ company: "Filler Co", limit: "12", page: "2" });
  expect(first.body.data.pagination).toMatchObject({ total: 120, pages: 10 });
  expect(names(first).filter((name) => names(second).includes(name))).toHaveLength(0);
});
test("a user's private profile remains visible to that same user", async () => {
  const result = await search({ keyword: "Private" }, fixtures.byName.Private.user);
  expect(names(result)).toEqual(["Private"]);
});
test("support titles mentioning an executive are not classified as executives", async () => {
  const result = await search({ keyword: "Support" });
  expect(result.body.data.alumni[0].careerSeniority).toBe("");
  expect(names(await search({ seniority: "executive" }))).not.toContain("Support");
});
