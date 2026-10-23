const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const { transporter, isConfigured } = require("./emailTransport");

const sendApprovalEmail = async (email, name) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMRunite - Your Account Has Been Approved!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMRunite</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Great news! Your CMRunite alumni account has been <strong style="color: #16a34a;">approved</strong> by the admin.</p>
        <p>You can now log in and start connecting with your fellow CMRIT alumni.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" style="background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log In Now</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Welcome to the network!</p>
      </div>
    `,
  });
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const sendRejectionEmail = async (email, name, reason, comments = "") => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMRunite - Registration Not Approved",
    text: `Hi ${name || "there"},\n\nYour alumni registration was not approved.\nReason: ${reason || "Contact the administrator for details."}${comments ? `\nAdmin comments: ${comments}` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMRunite</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>We regret to inform you that your CMRunite alumni registration has <strong style="color: #dc2626;">not been approved</strong> at this time.</p>
        <p><strong>Reason:</strong> ${escapeHtml(reason || "Contact the administrator for details.")}</p>
        ${comments ? `<p style="white-space: pre-wrap;"><strong>Admin comments:</strong> ${escapeHtml(comments)}</p>` : ""}
        <p>If you believe this is an error, please contact the CMRIT admin team for clarification.</p>
        <p style="color: #64748b; font-size: 14px;">Thank you for your interest in joining CMRunite.</p>
      </div>
    `,
  });
};

const sendAnnouncementEmail = async (email, name, announcement, attachmentUrl, attachmentType) => {
  let attachmentSection = "";
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `CMRunite - ${announcement.title}`,
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
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">View or download it from CMRunite.</p>
    </div>`;
  }

  mailOptions.html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">CMRunite</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>You have a new announcement from the CMRIT admin team.</p>
        <div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e293b;">${escapeHtml(announcement.title)}</h3>
          <p style="margin: 0; color: #475569; line-height: 1.6;">${escapeHtml(announcement.message)}</p>
        </div>
        ${attachmentSection}
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/announcements" style="background: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View on CMRunite</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This email was sent to alumni of CMRIT.</p>
      </div>
    `;

  await transporter.sendMail(mailOptions);
};

const sendNotificationEmail = async (email, title, message, link = "") => {
  if (!isConfigured()) return false;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `CMRunite - ${String(title).slice(0, 120)}`,
    text: `${message}${link ? `\n\nOpen CMRunite: ${(process.env.FRONTEND_URL || "http://localhost:5173")}${link}` : ""}`,
  });
  return true;
};

const sendPasswordResetEmail = async (email, name, token) => {
  if (!isConfigured()) return false;
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "CMRunite - Reset your password",
    text: `Hi ${name || "there"},\n\nUse this link within 15 minutes to reset your CMRunite password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  });
  return true;
};

const sendPlacementJobEmail = async (job) => {
  const notification = job.placementNotification;
  const details = notification.snapshot;
  const url = `${notification.frontendUrl}/community-posts?type=job#post-${job._id}`;
  const rows = [
    ["Job title", details.title], ["Company", details.company], ["Location", details.location],
    ["Job type", details.type], ["Status", details.status], ["Vacancies", details.vacancy],
    ["Posted by", details.alumniName], ["Alumni email", details.alumniEmail],
    ["Posted at", new Date(job.createdAt).toISOString()], ["Description", details.description],
  ];
  const result = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: notification.recipient,
    replyTo: { name: details.alumniName, address: details.alumniEmail },
    messageId: `<placement-job-${job._id}@cmrunite.local>`,
    subject: `CMRunite - New alumni job posting: ${details.title.replace(/[\r\n]/g, " ").slice(0, 120)}`,
    text: `A new job opportunity has been posted by an alumnus.\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n\n")}\n\nView job: ${url}`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto;">
      <h2>New alumni job opportunity</h2>
      ${rows.map(([label, value]) => `<p style="white-space: pre-wrap;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join("")}
      <p><a href="${escapeHtml(url)}">View job on CMRunite</a></p>
    </div>`,
  });
  if (!result.accepted?.length) {
    const error = new Error("Placement recipient was not accepted by SMTP");
    error.code = "RECIPIENT_NOT_ACCEPTED";
    throw error;
  }
};

module.exports = { sendPlacementJobEmail, sendApprovalEmail, sendRejectionEmail, sendAnnouncementEmail, sendNotificationEmail, sendPasswordResetEmail };
