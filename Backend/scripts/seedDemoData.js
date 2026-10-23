require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/user");
const Alumni = require("../src/models/alumniModel");
const Event = require("../src/models/eventModel");
const { Job } = require("../src/models/job");

const demoUsers = [
  {
    name: "Aarav Sharma",
    email: "aarav.demo@example.com",
    profile: {
      firstName: "Aarav",
      lastName: "Sharma",
      startYear: 2015,
      endYear: 2019,
      degree: "bachelor",
      branch: "CSE",
      rollNumber: "DEMO-CSE-001",
      designation: "Senior Software Engineer",
      company: "CloudScale",
      domain: "Computer Science / Software",
      location: "Bengaluru",
      skills: ["React", "Node.js", "MongoDB", "AWS"],
      bio: "Backend and cloud engineer available for interview mentorship.",
    },
  },
  {
    name: "Meera Iyer",
    email: "meera.demo@example.com",
    profile: {
      firstName: "Meera",
      lastName: "Iyer",
      startYear: 2013,
      endYear: 2017,
      degree: "bachelor",
      branch: "ISE",
      rollNumber: "DEMO-ISE-002",
      designation: "Data Science Lead",
      company: "Insight Labs",
      domain: "Data Science / AI / ML",
      location: "Bengaluru",
      skills: ["Python", "Machine Learning", "SQL", "AWS"],
      bio: "Data scientist mentoring alumni transitioning into AI roles.",
    },
  },
  {
    name: "Rohan Patel",
    email: "rohan.demo@example.com",
    profile: {
      firstName: "Rohan",
      lastName: "Patel",
      startYear: 2019,
      endYear: 2023,
      degree: "bachelor",
      branch: "CSE",
      rollNumber: "DEMO-CSE-003",
      designation: "Software Engineer",
      company: "ProductWorks",
      domain: "Computer Science / Software",
      location: "Pune",
      skills: ["ReactJS", "Node", "PostgreSQL"],
      bio: "Full-stack engineer interested in alumni networking and referrals.",
    },
  },
];

const seed = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);

  const createdUsers = [];
  for (const demo of demoUsers) {
    let user = await User.findOne({ email: demo.email });
    if (!user) {
      user = await User.create({
        name: demo.name,
        email: demo.email,
        password: process.env.DEMO_PASSWORD || "DemoPass123!",
        role: "alumni",
        isApproved: true,
        approvalStatus: "approved",
      });
      await Alumni.create({
        user: user._id,
        email: demo.email,
        ...demo.profile,
        verified: true,
        verificationStatus: "verified",
        verifiedAt: new Date(),
        socialProfiles: { linkedin: "https://www.linkedin.com/" },
      });
    }
    createdUsers.push(user);
  }

  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    await Event.updateOne(
      { title: "Demo Alumni Leadership Meetup" },
      {
        $setOnInsert: {
          title: "Demo Alumni Leadership Meetup",
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          time: "10:00 AM",
          location: "CMRIT Auditorium",
          type: "Campus Event",
          description: "A seeded event for the final project demonstration.",
          capacity: 2,
          createdBy: admin._id,
        },
      },
      { upsert: true }
    );
  }

  await Job.updateOne(
    { title: "Demo Full Stack Engineer", author: createdUsers[0]._id },
    {
      $setOnInsert: {
        title: "Demo Full Stack Engineer",
        content: "A seeded role for demonstrating jobs and referral workflows.",
        company: "CloudScale",
        location: "Bengaluru",
        type: "Full-time",
        vacancy: 2,
        author: createdUsers[0]._id,
      },
    },
    { upsert: true }
  );

  console.log(`Demo data ready for ${createdUsers.length} alumni.`);
};

seed()
  .catch((error) => {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
