require("dotenv").config();
require("../src/config/production").loadSecrets();
(async () => {
  const recipient = process.argv[2];
  if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) throw new Error("Provide an explicit test recipient");
  const accepted = await require("../src/utils/emailHelper").sendNotificationEmail(recipient, "CMRunite delivery verification", "Operator-requested mail delivery check.", "/login");
  if (!accepted) throw Object.assign(new Error(), { code: "EMAIL_NOT_CONFIGURED" });
  console.log("SMTP accepted the verification message; confirm receipt in the recipient inbox.");
})().catch(error => { require("../src/utils/operationalLog").failure("email.verify_failed", error); process.exitCode = 1; });
