const mongoose = require("mongoose");
const NAME = "recipient_reminder_key_unique";
const KEY = { recipient: 1, "metadata.reminderKey": 1 };
const FILTER = { "metadata.reminderKey": { $type: "string" } };
const sameKey = (index) => JSON.stringify(index.key) === JSON.stringify(KEY);
const correct = (index) => index.name === NAME && sameKey(index) && index.unique === true && !index.sparse && JSON.stringify(index.partialFilterExpression) === JSON.stringify(FILTER);
const inspect = async () => {
  const collection = mongoose.connection.db.collection("notifications");
  let indexes = []; try { indexes = await collection.listIndexes().toArray(); } catch (error) { if (error.code !== 26) throw error; }
  return { collection, indexes };
};
const ensureNotificationIndexes = async () => {
  const { collection, indexes } = await inspect();
  const faulty = indexes.filter((index) => sameKey(index) && index.unique && !correct(index));
  if (faulty.length) throw new Error("Notification index migration required: pause writes, run npm run migrate:notification-index -- --apply after reviewing its dry run");
  if (indexes.some(correct)) return;
  if (await collection.countDocuments({})) throw new Error("Notification index migration required for existing history; run npm run migrate:notification-index first");
  await collection.createIndex({ recipient: 1, readAt: 1, createdAt: -1 });
  await collection.createIndex(KEY, { unique: true, name: NAME, partialFilterExpression: FILTER });
};
const migrateNotificationIndex = async (apply = false) => {
  const { collection, indexes } = await inspect();
  const invalid = await collection.find({ "metadata.reminderKey": { $exists: true, $ne: null }, $or: [{ "metadata.reminderKey": { $not: { $type: "string" } } }, { "metadata.reminderKey": "" }, { "metadata.reminderKey": /^\s+$/ }] }).project({ _id: 1 }).toArray();
  const duplicates = await collection.aggregate([{ $match: { "metadata.reminderKey": { $type: "string" } } }, { $group: { _id: { recipient: "$recipient", key: "$metadata.reminderKey" }, ids: { $push: "$_id" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $project: { _id: 0, ids: 1, count: 1 } }]).toArray();
  const old = indexes.filter((index) => sameKey(index) && index.unique && !correct(index));
  const conflict = indexes.find((index) => index.name === NAME && !correct(index));
  const report = { apply, records: await collection.countDocuments({}), oldIndexes: old.map((index) => index.name), replacementPresent: indexes.some(correct), invalidRecordIds: invalid.map((item) => item._id), duplicates, blocked: !!(invalid.length || duplicates.length || conflict) };
  if (!apply || report.blocked) return report;
  await collection.createIndex(KEY, { unique: true, name: NAME, partialFilterExpression: FILTER });
  if (!(await collection.listIndexes().toArray()).some(correct)) throw new Error("Replacement index verification failed; old indexes retained");
  for (const index of old) await collection.dropIndex(index.name);
  await ensureNotificationIndexes(); return { ...report, replacementPresent: true, migrated: true };
};
module.exports = { ensureNotificationIndexes, migrateNotificationIndex };
