const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendApprovalEmail = async (email, name) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMReunite - Your Account Has Been Approved!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMReunite</h2>
        <p>Hi ${name || "there"},</p>
        <p>Great news! Your CMReunite alumni account has been <strong style="color: #16a34a;">approved</strong> by the admin.</p>
        <p>You can now log in and start connecting with your fellow CMRIT alumni.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="http://localhost:5173/login" style="background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log In Now</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Welcome to the network!</p>
      </div>
    `,
  });
};

const sendRejectionEmail = async (email, name) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMReunite - Registration Not Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMReunite</h2>
        <p>Hi ${name || "there"},</p>
        <p>We regret to inform you that your CMReunite alumni registration has <strong style="color: #dc2626;">not been approved</strong> at this time.</p>
        <p>If you believe this is an error, please contact the CMRIT admin team for clarification.</p>
        <p style="color: #64748b; font-size: 14px;">Thank you for your interest in joining CMReunite.</p>
      </div>
    `,
  });
};

const sendAnnouncementEmail = async (email, name, announcement, attachmentUrl, attachmentType) => {
  let attachmentSection = "";
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `CMReunite - ${announcement.title}`,
    html: "",
    attachments: [],
  };

  if (attachmentUrl && attachmentType === "image") {
    const filePath = path.join(__dirname, "../../public", attachmentUrl);
    if (fs.existsSync(filePath)) {
      try {
        const resizedBuffer = await sharp(filePath)
          .resize({ width: 600, withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        const cid = "announcement-image";
        attachmentSection = `<img src="cid:${cid}" alt="Announcement attachment" style="width: 100%; max-width: 600px; border-radius: 8px; margin: 16px 0; display: block;" />`;
        mailOptions.attachments.push({
          filename: "announcement.jpg",
          content: resizedBuffer,
          contentType: "image/jpeg",
          cid,
        });
      } catch (err) {
        console.error("Image resize failed:", err.message);
      }
    }
  } else if (attachmentUrl && attachmentType === "pdf") {
    attachmentSection = `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: bold;">📎 PDF attachment included</p>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">View or download it from CMReunite.</p>
    </div>`;
  }

  mailOptions.html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMReunite</h2>
        <p>Hi ${name || "there"},</p>
        <p>You have a new announcement from the CMRIT admin team.</p>
        <div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e293b;">${announcement.title}</h3>
          <p style="margin: 0; color: #475569; line-height: 1.6;">${announcement.message}</p>
        </div>
        ${attachmentSection}
        <div style="text-align: center; margin: 24px 0;">
          <a href="http://localhost:5173/dashboard" style="background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View on CMReunite</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This email was sent to alumni of CMRIT.</p>
      </div>
    `;

  await transporter.sendMail(mailOptions);
};

const sendNotificationEmail = async (email, title, message, link = "") => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `CMReunite - ${String(title).slice(0, 120)}`,
    text: `${message}${link ? `\n\nOpen CMReunite: ${(process.env.FRONTEND_URL || "http://localhost:5173")}${link}` : ""}`,
  });
  return true;
};

const sendPasswordResetEmail = async (email, name, token) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMReunite - Reset your password",
    text: `Hi ${name || "there"},\n\nUse this link within 15 minutes to reset your CMReunite password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  });
  return true;
};

module.exports = { sendApprovalEmail, sendRejectionEmail, sendAnnouncementEmail, sendNotificationEmail, sendPasswordResetEmail };
