require("dotenv").config();
const mongoose = require("mongoose");
(async () => {
  const args = process.argv.slice(2), email = args[args.indexOf("--email") + 1]?.toLowerCase();
  if (!args.includes("--email") || !email) throw new Error("Specify --email existing-admin@example.com; --create uses SUPER_ADMIN_PASSWORD from the environment");
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const User = require("../src/models/user");
    const access = require("../src/services/departmentAccess");
    let account = await User.findOne({ email });
    if (args.includes("--create")) {
      if (account) throw new Error("Email already exists; use explicit promotion instead");
      const password = process.env.SUPER_ADMIN_PASSWORD || "";
      if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^a-z0-9]/i.test(password)) throw new Error("Set a strong SUPER_ADMIN_PASSWORD in the environment");
      account = await User.create({ email, name: process.env.SUPER_ADMIN_NAME || "Super Admin", role: "super_admin", password, isActive: true });
    } else {
      if (!account || !["admin", "super_admin"].includes(account.role)) throw new Error("Only an existing administrator can be promoted");
      account.role = "super_admin"; account.department = null; account.isActive = true; account.mustChangePassword = false; await account.save();
    }
    await access.revokeSessions(account._id);
    await access.audit(account, "super_admin.provisioned", account._id);
    console.log("Super Admin provisioned; previous sessions revoked. Sign in with the selected account.");
  } finally { await mongoose.disconnect(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
