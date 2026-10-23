"use strict";

const fs = require("node:fs");
const { MongoClient } = require("mongodb");

const configPath = process.env.MONGO_BACKUP_CONFIG_FILE || "/run/secrets/mongo_backup_config";

async function main() {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.uri || typeof config.uri !== "string") throw new Error("Mongo backup configuration is missing its URI");
  const client = new MongoClient(config.uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const database = client.db("alumniDB");
    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of collections) {
      if (name.startsWith("system.")) continue;
      if (await database.collection(name).countDocuments({}, { limit: 1 })) {
        throw new Error("Restore refused: target application database is not empty");
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
