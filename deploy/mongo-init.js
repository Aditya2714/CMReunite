// Runs only on a NEW empty MongoDB volume; never rewrites an existing deployment.
const fs = require("fs");
const database = db.getSiblingDB("alumniDB");
for (const [user, file, role] of [["cm_app", "/run/secrets/mongo_app_password", "readWrite"], ["cm_ml", "/run/secrets/mongo_ml_password", "read"]]) {
  database.createUser({ user, pwd: fs.readFileSync(file, "utf8").trim(), roles: [{ role, db: "alumniDB" }] });
}
