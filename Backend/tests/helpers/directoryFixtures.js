const User = require("../../src/models/user");
const Alumni = require("../../src/models/alumniModel");
const Connection = require("../../src/models/connectionModel");
const seedDirectoryFixtures = async () => {
  const viewer = await User.create({ name: "Viewer Alumni", email: "viewer@example.com", role: "alumni", password: "StrongPass123!" });
  const hash = (await User.findById(viewer._id).select("+password")).password;
  const definitions = [
    ["Mira", "Vice President", "Microsoft", 2018],
    ["Vikram", "VP, Engineering", "Microsoft", 2020],
    ["Veda", "Vice-President", "Microsoft", 2010],
    ["Sana", "Senior Vice President", "Microsoft", 2012],
    ["Evan", "EVP", "Microsoft", 2015],
    ["Ada", "Chief Executive Officer", "Microsoft", 2020],
    ["Ari", "CTO", "Other Co", 2020],
    ["Dee", "Director of Engineering", "Microsoft", 2018],
    ["Hema", "Head of Product", "Microsoft", 2016],
    ["Max", "Senior Manager", "Microsoft", 2020],
    ["Sara", "Senior Engineer", "Microsoft", 2020],
    ["Priya", "Principal Engineer", "Other Co", 2020],
    ["OldBatch", "Engineer", "Microsoft", 1990],
    ["YoungVP", "V.P.", "Microsoft", 2025],
    ["History", "Engineer", "Other Co", 2011],
    ["Private", "VP", "Microsoft", 2018, { privacy: { profileVisibility: "private" } }],
    ["Network", "VP", "Microsoft", 2018, { privacy: { profileVisibility: "network" } }],
    ["Unconnected", "VP", "Microsoft", 2018, { privacy: { profileVisibility: "network" } }],
    ["Blocked", "VP", "Microsoft", 2018],
    ["BlocksViewer", "VP", "Microsoft", 2018, { blockedUsers: [viewer._id] }],
    ["Pending", "VP", "Microsoft", 2018, { isApproved: false, approvalStatus: "pending" }],
    ["PublicContact", "VP", "Contact Co", 2018, { privacy: { showEmail: true, showPhone: true } }],
    ["Support", "Executive Assistant to CEO", "Microsoft", 2020],
    ["RegexLiteral", "C++ Architect", "C++ Labs (R&D)", 2018],
  ];
  for (let i = 0; i < 120; i++) definitions.push([`Filler${i}`, "Engineer", "Filler Co", 2020]);
  const users = await User.insertMany(definitions.map(([firstName, , , , extra = {}]) => ({ name: `${firstName} Alumni`, email: `${firstName.toLowerCase()}@example.com`, password: hash, role: "alumni", ...extra })));
  const profiles = await Alumni.insertMany(definitions.map(([firstName, designation, company, endYear], index) => ({
    user: users[index]._id, email: users[index].email, firstName, lastName: "Alumni", designation, company, endYear,
    startYear: endYear - 4, degree: "BE", branch: "CSE", rollNumber: `USN${index}`, domain: "Software",
    location: "Bengaluru", skills: ["JavaScript"], mobileNumber: 9999999999,
    ...(firstName === "History" ? { workExperiences: [{ workTitle: "Vice President", company: "Microsoft", endYear: "2010" }] } : {}),
    createdAt: new Date(Date.UTC(2026, 0, 1) + index * 1000),
  })));
  const byName = Object.fromEntries(users.map((user, index) => [definitions[index][0], { user, profile: profiles[index] }]));
  viewer.blockedUsers = [byName.Blocked.user._id]; await viewer.save();
  await Connection.create({ requester: viewer._id, recipient: byName.Network.user._id, status: "accepted" });
  await Connection.create({ requester: viewer._id, recipient: byName.Unconnected.user._id, status: "pending" });
  return { viewer, byName };
};
module.exports = { seedDirectoryFixtures };
