const mongoose = require("mongoose");
const { fail } = require("./departmentAccess");
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
// Native reads keep dry-run free of writes, defaults, index builds and notifications.
const migrateDepartments = async (mapping, apply = false) => {
  const db = mongoose.connection.db;
  const definitions = mapping.departments || [];
  const codes = new Set();
  for (const entry of definitions) { if (!/^[A-Z][A-Z0-9_-]{1,15}$/.test(entry.code) || !entry.name || codes.has(entry.code)) fail(400, "Invalid or duplicate department definition"); codes.add(entry.code); }
  const existing = await db.collection("departments").find({}).toArray();
  const byCode = new Map(existing.map((entry) => [entry.code, entry]));
  for (const entry of definitions) if (!byCode.has(entry.code)) byCode.set(entry.code, { ...entry, _id: new mongoose.Types.ObjectId(), isActive: true });
  const aliases = new Map();
  for (const entry of [...existing, ...definitions]) { aliases.set(normalize(entry.code), entry.code); aliases.set(normalize(entry.name), entry.code); }
  for (const [branch, code] of Object.entries(mapping.branches || {})) { if (!byCode.has(code)) fail(400, `Unknown department code in mapping: ${code}`); aliases.set(normalize(branch), code); }
  const resolve = (code) => { if (!code) return null; const department = byCode.get(code); if (!department || department.isActive === false) fail(400, `Mapping refers to missing/archived department: ${code}`); return department; };
  const users = await db.collection("users").find({}, { projection: { password: 0, passwordResetTokenHash: 0, passwordResetExpiresAt: 0 } }).toArray();
  const userById = new Map(users.map((entry) => [String(entry._id), entry]));
  const changes = [], report = { apply, departmentsToCreate: [...byCode.values()].filter((entry) => !existing.some((old) => old.code === entry.code)).map((entry) => entry.code), alumni: 0, admins: 0, events: 0, announcements: 0, unassigned: [] };
  const occupied = new Map();
  for (const user of users.filter((entry) => entry.role === "admin")) {
    const department = user.department ? byCode.size && [...byCode.values()].find((entry) => String(entry._id) === String(user.department)) : resolve(mapping.admins?.[user.email]);
    if (department && user.isActive !== false) { if (occupied.has(String(department._id))) fail(409, `Multiple active admins map to ${department.code}`); occupied.set(String(department._id), user._id); }
    if (!user.department && department) { changes.push({ collection: "users", id: user._id, set: { department: department._id, isActive: user.isActive !== false }, absent: true }); report.admins++; }
    else if (!user.department) report.unassigned.push({ type: "admin", id: String(user._id), email: user.email });
  }
  for (const profile of await db.collection("alumnis").find({ department: null }).toArray()) {
    const account = userById.get(String(profile.user)); if (!account || account.role !== "alumni") continue;
    const department = account.department ? [...byCode.values()].find((entry) => String(entry._id) === String(account.department)) : resolve(aliases.get(normalize(profile.branch)));
    if (!department) { report.unassigned.push({ type: "alumni", id: String(profile._id), branch: profile.branch }); continue; }
    changes.push({ collection: "alumnis", id: profile._id, set: { department: department._id }, absent: true });
    if (!account.department) changes.push({ collection: "users", id: account._id, set: { department: department._id }, absent: true });
    report.alumni++;
  }
  for (const event of await db.collection("events").find({ department: null, scope: { $ne: "platform" } }).toArray()) {
    const requested = mapping.events?.[String(event._id)];
    if (!requested) { report.unassigned.push({ type: "event", id: String(event._id), title: event.title }); continue; }
    const department = requested === "platform" ? null : resolve(requested);
    changes.push({ collection: "events", id: event._id, set: { department: department?._id || null, scope: department ? "department" : "platform", eligibility: department ? "department" : "all" }, absent: true }); report.events++;
  }
  for (const announcement of await db.collection("announcements").find({ department: null, scope: { $ne: "platform" } }).toArray()) {
    const global = announcement.branch === "All branches";
    const department = global ? null : resolve(aliases.get(normalize(announcement.branch)));
    if (!global && !department) { report.unassigned.push({ type: "announcement", id: String(announcement._id) }); continue; }
    changes.push({ collection: "announcements", id: announcement._id, set: { scope: global ? "platform" : "department", department: department?._id || null, ...(global ? { batch: "All batches" } : {}) }, absent: true }); report.announcements++;
  }
  if (apply) {
    for (const department of byCode.values()) await db.collection("departments").updateOne({ code: department.code }, { $setOnInsert: department }, { upsert: true });
    for (const change of changes) {
      const result = await db.collection(change.collection).updateOne({ _id: change.id, department: null, ...(change.collection === "events" || change.collection === "announcements" ? { scope: { $ne: "platform" } } : {}) }, { $set: change.set, ...(change.collection === "users" ? { $inc: { authVersion: 1 } } : {}) });
      if (change.collection === "users" && result.modifiedCount) await db.collection("authsessions").updateMany({ user: change.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
    await db.collection("users").updateMany({ role: "admin", isActive: { $exists: false } }, { $set: { isActive: true } });
    // Explicit audit evidence without touching authored timestamps or sending notifications.
    await db.collection("auditlogs").insertOne({ action: "migration.departments", target: "department-migration", details: { alumni: report.alumni, admins: report.admins, events: report.events, announcements: report.announcements }, createdAt: new Date() });
  }
  return report;
};
module.exports = { migrateDepartments };
