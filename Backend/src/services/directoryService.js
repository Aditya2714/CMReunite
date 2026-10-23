const { z } = require("zod");
const Alumni = require("../models/alumniModel");
const User = require("../models/user");
const Connection = require("../models/connectionModel");
const SENIORITY_OPTIONS = [
  { value: "senior", label: "Senior Professionals" },
  { value: "manager", label: "Managers" },
  { value: "director", label: "Directors / Heads" },
  { value: "vp", label: "VP-level" },
  { value: "executive", label: "Executives / Founders" },
];
// Rules use the current profile designation, never batch or historical employment.
const RULES = [
  { value: "vp", pattern: /\b(?:[se]?v\.?p\.?|(?:(?:senior|executive)[\s-]+)?vice[\s-]+president)\b/i },
  { value: "executive", pattern: /\b(?:c\.?[eftoimhpsd]\.?o\.?|c\.?i\.?s\.?o\.?|c\.?h\.?r\.?o\.?|chief\b[^,;\n]{0,80}\bofficer|(?:co[\s-]?)?founder|president)\b/i },
  { value: "director", pattern: /\b(?:director|head)\b/i },
  { value: "manager", pattern: /\b(?:manager|team[\s-]+lead)\b/i },
  { value: "senior", pattern: /\b(?:senior|sr\.?|lead|principal|staff)\b/i },
];
const SUPPORT_PATTERN = /\b(?:assistant|secretary|advisor|adviser)\s+to\b|\breporting\s+to\b|\boffice\s+of\b/i;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const literal = (value) => new RegExp(escapeRegex(value), "i");
const acronymPattern = (short, expanded) => new RegExp(`\\b(?:${short.split("").join("\\.?")}\\.?|${expanded.split(" ").join("[\\s-]+")})\\b`, "i");
const designationPattern = (value) => {
  const key = value.toLowerCase().replace(/[.\s-]/g, "");
  if (["vp", "vicepresident"].includes(key)) return RULES[0].pattern;
  if (["svp", "seniorvicepresident"].includes(key)) return acronymPattern("svp", "senior vice president");
  if (["evp", "executivevicepresident"].includes(key)) return acronymPattern("evp", "executive vice president");
  for (const [short, full] of Object.entries({ ceo: "chief executive officer", cto: "chief technology officer", cfo: "chief financial officer", coo: "chief operating officer", cio: "chief information officer", cmo: "chief marketing officer" })) {
    if (key === short || key === full.replaceAll(" ", "")) return acronymPattern(short, full);
  }
  return literal(value);
};
const text = z.string().trim().max(200).default("");
const integer = (fallback, max) => z.string().regex(/^[1-9]\d*$/).transform(Number).refine((value) => Number.isSafeInteger(value) && value <= max).default(fallback);
const querySchema = z.object({
  keyword: text, company: text, designation: text,
  seniority: z.enum(["", ...SENIORITY_OPTIONS.map((item) => item.value)]).default(""),
  batch: z.string().trim().regex(/^(?:\d{4})?$/).default(""),
  branch: text, location: text, page: integer(1, 100000), limit: integer(100, 100),
});
const parseDirectoryQuery = (query) => {
  const result = querySchema.safeParse(query);
  if (!result.success) { const error = new Error("Invalid directory filters or pagination"); error.status = 400; error.expose = true; throw error; }
  return result.data;
};
const careerExpression = { $cond: [
  { $regexMatch: { input: { $ifNull: ["$designation", ""] }, regex: SUPPORT_PATTERN.source, options: "i" } },
  "",
  { $switch: {
  branches: RULES.map((rule) => ({ case: { $regexMatch: { input: { $ifNull: ["$designation", ""] }, regex: rule.pattern.source, options: "i" } }, then: rule.value })), default: "",
} },
] };
const searchDirectory = async (viewer, rawQuery, profileId = null) => {
  const filters = parseDirectoryQuery(rawQuery);
  const match = {};
  if (profileId) match._id = new (require("mongoose").Types.ObjectId)(profileId);
  if (filters.company) match.company = literal(filters.company);
  if (filters.designation) {
    match.designation = designationPattern(filters.designation);
    if (RULES.some((rule) => rule.pattern.test(filters.designation)) && !SUPPORT_PATTERN.test(filters.designation)) {
      match.$nor = [{ designation: SUPPORT_PATTERN }];
    }
  }
  if (filters.batch) match.endYear = Number(filters.batch);
  if (filters.branch) match.branch = literal(filters.branch);
  if (filters.location) match.location = literal(filters.location);
  if (filters.keyword) match.$or = ["firstName", "lastName", "branch", "degree", "skills", "company", "designation", "location"].map((field) => ({ [field]: field === "designation" ? designationPattern(filters.keyword) : literal(filters.keyword) }));
  const accounts = await require("./discoveryPolicy").eligibleAccounts(viewer, { includeSelf: true });
  const visible = { user: { $in: accounts.map((account) => account._id) } };
  const [result] = await Alumni.aggregate([
    { $match: match },
    { $lookup: { from: User.collection.name, localField: "user", foreignField: "_id", as: "account" } },
    { $unwind: "$account" },
    { $match: { "account.role": "alumni", "account.isApproved": true, "account.approvalStatus": { $ne: "rejected" } } },
    { $match: visible },
    { $set: { careerSeniority: careerExpression } },
    ...(filters.seniority ? [{ $match: { careerSeniority: filters.seniority } }] : []),
    { $facet: {
      items: [
        { $sort: { createdAt: -1, _id: -1 } }, { $skip: (filters.page - 1) * filters.limit }, { $limit: filters.limit },
        { $set: {
          email: { $cond: [{ $eq: ["$account.privacy.showEmail", true] }, "$email", ""] },
          mobileNumber: { $cond: [{ $eq: ["$account.privacy.showPhone", true] }, "$mobileNumber", "$$REMOVE"] },
        } },
        { $project: { account: 0, verificationNote: 0, verificationStatus: 0, verifiedBy: 0, password: 0 } },
      ],
      total: [{ $count: "value" }],
    } },
  ]);
  const total = result.total[0]?.value || 0;
  return {
    alumni: result.items.map((profile) => ({ ...profile, careerSeniorityLabel: SENIORITY_OPTIONS.find((option) => option.value === profile.careerSeniority)?.label || "Not classified" })),
    pagination: { page: filters.page, limit: filters.limit, total, pages: Math.ceil(total / filters.limit) },
  };
};
module.exports = { SENIORITY_OPTIONS, RULES, designationPattern, parseDirectoryQuery, searchDirectory };
