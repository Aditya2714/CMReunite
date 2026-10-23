const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const { z } = require("zod");
const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const OTP = require("../models/otpModel");
const validate = require("../middlewares/validate");

const router = express.Router();

const optionalText = z.string().trim().optional().default("");
const registrationSchema = z.object({
  name: optionalText,
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must contain at least 8 characters"),
  role: z.literal("alumni").optional().default("alumni"),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endYear: z.coerce.number().int().min(1950).max(2100),
  degree: z.string().trim().min(1),
  branch: optionalText,
  department: z.string().regex(/^[a-fA-F0-9]{24}$/),
  rollNumber: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: optionalText,
  linkedinUrl: optionalText,
  designation: z.string().trim().min(1),
  domain: z.string().trim().min(1),
}).refine((data) => data.endYear >= data.startYear, {
  path: ["endYear"],
  message: "End year must be greater than or equal to start year",
});

router.post("/", validate(registrationSchema), asyncHandler(async (req, res) => {
  let user;
  try {
    const department = await require("../services/departmentAccess").activeDepartment(req.body.department);
    req.body.branch = department.code;
    const existingUser = await User.exists({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({
        status: "fail",
        message: "Email is already registered",
      });
    }

    const verifiedOtp = await OTP.findOne({
      email: req.body.email,
      verified: true,
      expiresAt: { $gt: new Date() },
    }).sort({ _id: -1 });
    if (!verifiedOtp) {
      return res.status(400).json({
        status: "fail",
        message: "Please verify your email before registering",
      });
    }

    user = await User.create({
      name: req.body.name || [req.body.firstName, req.body.lastName].filter(Boolean).join(" "),
      email: req.body.email,
      password: req.body.password,
      role: "alumni",
      department: department._id,
      isApproved: false,
      approvalStatus: "pending",
    });

    await Alumni.create({
      user: user._id,
      department: department._id,
      email: req.body.email,
      startYear: req.body.startYear,
      endYear: req.body.endYear,
      degree: req.body.degree,
      branch: req.body.branch,
      rollNumber: req.body.rollNumber,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      designation: req.body.designation,
      domain: req.body.domain,
      socialProfiles: {
        linkedin: req.body.linkedinUrl || "https://www.linkedin.com/",
      },
    });
    await OTP.deleteMany({ email: req.body.email });

    return res.status(201).json({
      status: "success",
      message: "Registration submitted for administrator approval",
    });
  } catch (error) {
    if (user?._id) await User.findByIdAndDelete(user._id).catch(() => {});
    if (error.status) return res.status(error.status).json({ status: "fail", message: error.message });
    if (error?.code === 11000) {
      return res.status(409).json({ status: "fail", message: "Email is already registered" });
    }
    console.error("Registration failed:", error.message);
    return res.status(500).json({ status: "fail", message: "Registration failed" });
  }
}));

module.exports = router;
