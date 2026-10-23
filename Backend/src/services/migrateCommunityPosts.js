const mongoose = require("mongoose");
const Post = require("../models/postModel");
// Sources remain untouched for recovery. Markers prevent deleted imports being resurrected.
const migrateCommunityPosts = async () => {
  const markers = mongoose.connection.collection("communityPostMigrations");
  let imported = 0;
  for (const source of ["jobs", "stories"]) {
    for await (const legacy of mongoose.connection.collection(source).find({})) {
      const markerId = `${source}:${legacy._id}`;
      if (await markers.findOne({ _id: markerId })) continue;
      const existing = await Post.collection.findOne({ _id: legacy._id });
      if (existing && existing.legacySource !== source) throw new Error(`Community post ID collision for ${source}/${legacy._id}; no source data was changed`);
      const document = source === "jobs" ? {
        _id: legacy._id, postType: "job", author: legacy.createdBy, authorName: "Alumni",
        title: legacy.title, content: legacy.description, company: legacy.company,
        location: legacy.location, type: legacy.type, status: legacy.status, vacancy: legacy.vacancy,
        ...(legacy.placementNotification ? { placementNotification: legacy.placementNotification } : {}),
      } : {
        _id: legacy._id, postType: "story", author: legacy.author, authorName: legacy.authorName || "Alumni",
        title: legacy.title, content: legacy.content, category: legacy.tag || "Career Journey",
      };
      const author = await mongoose.connection.collection("users").findOne({ _id: document.author }, { projection: { name: 1 } });
      if (source === "jobs" && author?.name) document.authorName = author.name;
      Object.assign(document, { legacySource: source, createdAt: legacy.createdAt, updatedAt: legacy.updatedAt });
      const result = await Post.collection.updateOne({ _id: legacy._id }, { $setOnInsert: document }, { upsert: true });
      imported += result.upsertedCount;
      await markers.updateOne({ _id: markerId }, { $setOnInsert: { migratedAt: new Date(), postId: legacy._id } }, { upsert: true });
    }
  }
  return { imported };
};
module.exports = { migrateCommunityPosts };
