require("dotenv").config();
const mongoose = require("mongoose");
const { migrateCommunityPosts } = require("../src/services/migrateCommunityPosts");
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Community posts migration:", await migrateCommunityPosts());
  } finally { await mongoose.disconnect(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
