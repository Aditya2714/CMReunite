const nodemailer = require("nodemailer");
const crypto = require("crypto");
const OTP = require("../models/otpModel");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: "fail", message: "Email is required" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email, verified: false });

    await OTP.create({ email, otp, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CMReunite - Email Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #1e40af;">CMReunite</h2>
          <p>Your email verification OTP is:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This OTP expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });

    res.status(200).json({ status: "success", message: "OTP sent to your email" });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ status: "fail", message: "Failed to send OTP. Please try again." });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ status: "fail", message: "Email and OTP are required" });
    }

    const record = await OTP.findOne({ email, verified: false }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ status: "fail", message: "No OTP found. Please request a new one." });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ status: "fail", message: "OTP has expired. Please request a new one." });
    }

    if (record.attempts >= 3) {
      return res.status(400).json({ status: "fail", message: "Too many attempts. Please request a new OTP." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      const remaining = 3 - record.attempts;
      return res.status(400).json({
        status: "fail",
        message: remaining > 0 ? `Incorrect OTP. ${remaining} attempts remaining.` : "OTP locked. Please request a new one.",
      });
    }

    record.verified = true;
    await record.save();

    res.status(200).json({ status: "success", message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ status: "fail", message: "Failed to verify OTP" });
  }
};

module.exports = { sendOtp, verifyOtp };
