require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/user");
const Alumni = require("../src/models/alumniModel");
const { Admin } = require("../src/models/adminModel");
const { College } = require("../src/models/collegeModel");
const { isPasswordHash } = require("../src/utils/password");

const migrateCredentials = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({}).select("+password");
  let upgradedUsers = 0;
  for (const user of users) {
    if (user.password && !isPasswordHash(user.password)) {
      user.markModified("password");
      await user.save();
      upgradedUsers += 1;
    }
  }

  const profileResults = await Promise.all([
    Alumni.updateMany({ password: { $exists: true } }, { $unset: { password: 1 } }),
    Admin.updateMany({ password: { $exists: true } }, { $unset: { password: 1 } }),
    College.updateMany({ password: { $exists: true } }, { $unset: { password: 1 } }),
  ]);
  const approvedAlumniUsers = await User.find({
    role: "alumni",
    isApproved: true,
    approvalStatus: "approved",
  }).select("_id");
  const verificationResult = await Alumni.updateMany(
    {
      user: { $in: approvedAlumniUsers.map((user) => user._id) },
      verificationStatus: { $ne: "verified" },
    },
    {
      verified: true,
      verificationStatus: "verified",
      verificationNote: "Migrated from an approved legacy account",
    }
  );

  console.log({
    upgradedUsers,
    cleanedProfiles: profileResults.reduce((total, result) => total + result.modifiedCount, 0),
    verifiedLegacyProfiles: verificationResult.modifiedCount,
  });
};

migrateCredentials()
  .catch((error) => {
    console.error("Credential migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
