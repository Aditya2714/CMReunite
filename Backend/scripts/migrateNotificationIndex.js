require("dotenv").config();
const mongoose = require("mongoose");
(async () => {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) throw new Error("Use no arguments for dry run, or --apply with writes paused and a verified backup");
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false });
  try {
    const report = await require("../src/services/notificationIndexes").migrateNotificationIndex(args.includes("--apply"));
    console.log(JSON.stringify(report, null, 2)); if (report.blocked) process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
})().catch(() => { console.error("Notification index migration failed; inspect the database and retain the backup before retrying"); process.exitCode = 1; });
