const mongoose = require("mongoose");
const Post = require("./postModel");
module.exports = Post.discriminator("Story", new mongoose.Schema({}), "story");
