require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/user");
const Department = require("../src/models/departmentModel");
const { Admin } = require("../src/models/adminModel");
const Alumni = require("../src/models/alumniModel");

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const upsertUser = async ({ email, name, role, password, department = null }) => {
  let user = await User.findOne({ email });
  if (!user) user = new User({ email, name, role, password });
  user.name = name;
  user.role = role;
  user.department = department;
  user.isActive = true;
  user.isApproved = true;
  user.approvalStatus = "approved";
  user.mustChangePassword = false;
  if (process.env.RESET_DEMO_PASSWORDS === "true") user.password = password;
  await user.save();
  return user;
};

const provision = async () => {
  await mongoose.connect(requiredEnv("MONGODB_URI"));

  const departments = {};
  for (const item of [
    ["CSE", "Computer Science and Engineering"],
    ["ISE", "Information Science and Engineering"],
    ["ECE", "Electronics and Communication Engineering"],
  ]) {
    departments[item[0]] = await Department.findOneAndUpdate(
      { code: item[0] },
      { $set: { name: item[1], isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const superAdmin = await upsertUser({
    email: "superadmin.demo@example.com",
    name: "Super Admin",
    role: "super_admin",
    password: requiredEnv("SUPER_ADMIN_PASSWORD"),
  });

  const adminPassword = requiredEnv("ADMIN_PASSWORD");
  for (const code of ["CSE", "ISE", "ECE"]) {
    const admin = await upsertUser({
      email: `${code.toLowerCase()}.admin@example.com`,
      name: `${code} Department Admin`,
      role: "admin",
      password: adminPassword,
      department: departments[code]._id,
    });
    await Admin.findOneAndUpdate(
      { user: admin._id },
      {
        $set: {
          adminName: admin.name,
          email: admin.email,
          role: "admin",
          officialDesignation: "Department Coordinator",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const alumni = await upsertUser({
    email: "alumni.demo@example.com",
    name: "Rahul Sharma",
    role: "alumni",
    password: requiredEnv("ALUMNI_PASSWORD"),
    department: departments.CSE._id,
  });
  await Alumni.findOneAndUpdate(
    { user: alumni._id },
    {
      $set: {
        email: alumni.email,
        firstName: "Rahul",
        lastName: "Sharma",
        startYear: 2020,
        endYear: 2024,
        degree: "bachelor",
        branch: "CSE",
        rollNumber: "DEMO-CSE-2024",
        designation: "Software Engineer",
        company: "CMRunite Demo",
        domain: "Computer Science / Software",
        location: "Bengaluru",
        skills: ["React", "Node.js", "MongoDB"],
        bio: "Demo alumni account for CMRunite presentations.",
        verified: true,
        verificationStatus: "verified",
        verifiedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await User.syncIndexes();
  console.log(`Deployment demo accounts provisioned. Super Admin ID: ${superAdmin._id}`);
};

provision()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
