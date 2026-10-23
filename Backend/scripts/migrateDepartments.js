require("dotenv").config();
const fs = require("node:fs");
const mongoose = require("mongoose");
(async () => {
  const args = process.argv.slice(2), file = args[args.indexOf("--mapping") + 1];
  if (!args.includes("--mapping") || !file) throw new Error("Use --mapping reviewed-mapping.json; add --apply only after backup and pausing writes");
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false });
  try { console.log(JSON.stringify(await require("../src/services/migrateDepartments").migrateDepartments(JSON.parse(fs.readFileSync(file, "utf8")), args.includes("--apply")), null, 2)); }
  finally { await mongoose.disconnect(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
