"use strict";

const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient("mongodb://mongodb:27017/alumniDB", { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    await client.db("alumniDB").collection("users").countDocuments({});
    throw new Error("Anonymous MongoDB read unexpectedly succeeded");
  } catch (error) {
    if (error?.code !== 13 && error?.codeName !== "Unauthorized") throw error;
    console.log("Anonymous MongoDB read rejected: PASS");
  } finally {
    await client.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
