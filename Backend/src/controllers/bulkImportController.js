const crypto = require("node:crypto");
const multer = require("multer");
const Alumni = require("../models/alumniModel");
const User = require("../models/user");
const Department = require("../models/departmentModel");
const { parseWorkbook, parseCsvRecords, normalizeHeader } = require("../services/alumniImportParser");

const supportedExtensions = [".csv", ".xlsx"];
const supportedMimeTypes = ["text/csv", "application/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const getFileExtension = (fileName = "") => supportedExtensions.find((extension) => fileName.toLowerCase().endsWith(extension)) || "";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = getFileExtension(file.originalname);
    if (!extension || (!supportedMimeTypes.includes(file.mimetype) && !supportedExtensions.includes(extension))) {
      return callback(new Error("Please upload an XLSX workbook or CSV file."));
    }
    callback(null, true);
  },
}).single("file");

const departmentAliases = {
  cse: ["cse", "computerscience", "computerscienceandengineering"],
  ece: ["ece", "electronics", "electronicsandcommunicationengineering"],
  ise: ["ise", "informationscience", "informationscienceandengineering"],
  mec: ["mec", "me", "mechanical", "mechanicalengineering"],
  civ: ["civ", "cv", "civil", "civilengineering"],
  eee: ["eee", "electricalandelectronicsengineering"],
  aiml: ["aiml", "artificialintelligenceandmachinelearning"],
  aids: ["aids", "artificialintelligenceanddatascience"],
  tce: ["tce", "telecommunication", "telecommunicationengineering"],
  mba: ["mba", "masterofbusinessadministration"],
  mca: ["mca", "masterofcomputerapplications"],
};

const aliasSet = (value) => {
  const normalized = normalizeHeader(value);
  const group = Object.values(departmentAliases).find((items) => items.includes(normalized));
  return new Set(group || [normalized]);
};
const findDepartment = (departments, hint) => {
  if (!hint) return null;
  const possible = aliasSet(hint);
  return departments.find((department) => possible.has(normalizeHeader(department.code)) || possible.has(normalizeHeader(department.name))) || null;
};
const splitName = (record) => {
  if (record.firstName) return { firstName: record.firstName, lastName: record.lastName || "" };
  const parts = String(record.fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
};
const inferEducation = (record, departmentCode) => {
  const endYear = Number.parseInt(record.endYear, 10);
  const normalized = normalizeHeader(departmentCode || record.departmentHint || record.branch);
  const degree = record.degree || (normalized === "mba" ? "MBA" : normalized === "mca" ? "MCA" : normalized ? "BE" : "Not added");
  const duration = normalizeHeader(degree) === "mba" ? 2 : normalizeHeader(degree) === "mca" ? 3 : 4;
  const startYear = Number.parseInt(record.startYear, 10) || (Number.isInteger(endYear) ? endYear - duration : NaN);
  return { degree, startYear, endYear };
};
const addError = (summary, record, reason) => {
  summary.skipped += 1;
  summary.errorCount += 1;
  if (summary.errors.length < 200) summary.errors.push({ sheet: record.sourceSheet, line: record.sourceLine, email: record.email || undefined, reason });
};
const normalizePhone = (value) => {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  if (!digits || digits.length > 15) return undefined;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : undefined;
};

const bulkImport = (req, res) => {
  upload(req, res, async (error) => {
    try {
      if (error) return res.status(400).json({ status: "fail", message: error.message });
      if (!req.file) return res.status(400).json({ status: "fail", message: "XLSX workbook or CSV file is required" });
      if (!["admin", "super_admin"].includes(req.user?.role)) return res.status(403).json({ status: "fail", message: "Only admins can bulk import alumni" });

      const extension = getFileExtension(req.file.originalname);
      if (extension === ".csv" && req.file.buffer.includes(0)) return res.status(400).json({ status: "fail", message: "Binary content is not allowed in CSV uploads" });
      const parsed = extension === ".xlsx" ? await parseWorkbook(req.file.buffer) : parseCsvRecords(req.file.buffer);
      if (!parsed.records.length) return res.status(400).json({ status: "fail", message: "No alumni rows were found in the uploaded file" });
      if (parsed.records.length > 5000) return res.status(400).json({ status: "fail", message: "Imports are limited to 5,000 alumni rows" });

      const departments = await Department.find({ isActive: true }).select("code name").lean();
      const summary = { format: extension.slice(1), imported: 0, skipped: 0, errorCount: 0, errors: [], sheets: parsed.sheets };

      for (const record of parsed.records) {
        const email = String(record.email || "").trim().toLowerCase();
        const { firstName, lastName } = splitName(record);
        const department = findDepartment(departments, record.branch || record.departmentHint);
        const education = inferEducation(record, department?.code);
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) { addError(summary, record, "A valid email ID is required"); continue; }
        if (!firstName) { addError(summary, record, "Name is required"); continue; }
        if (!Number.isInteger(education.endYear) || education.endYear < 1900 || education.endYear > 2100) { addError(summary, record, "Graduating year must be a valid year"); continue; }
        if (req.user.role === "admin" && (!department || String(department._id) !== String(req.user.department))) {
          addError(summary, record, "Department is unknown, archived, or outside your access"); continue;
        }
        if (await User.exists({ email })) { addError(summary, record, "Email already exists"); continue; }

        const generatedPassword = !record.password;
        const password = record.password || `Aa1!${crypto.randomBytes(18).toString("base64url")}`;
        if (password.length < 8) { addError(summary, record, "Password is shorter than 8 characters"); continue; }
        let user;
        try {
          user = await User.create({
            name: [firstName, lastName].filter(Boolean).join(" "), email, password, role: "alumni",
            department: department?._id || null, isApproved: true, approvalStatus: "approved", mustChangePassword: generatedPassword,
          });
          await Alumni.create({
            user: user._id, department: department?._id || null, email,
            startYear: education.startYear, endYear: education.endYear, degree: education.degree,
            branch: department?.code || record.branch || record.departmentHint || "UNASSIGNED",
            rollNumber: record.rollNumber || `IMPORT-${normalizeHeader(record.sourceSheet).toUpperCase() || "ROW"}-${education.endYear}-${record.sourceLine}`,
            firstName, lastName, company: record.company, designation: record.designation || "Not added", domain: record.domain || "Not added",
            location: record.location, mobileNumber: normalizePhone(record.phone),
            socialProfiles: record.linkedin ? { linkedin: record.linkedin } : undefined,
          });
          summary.imported += 1;
        } catch (rowError) {
          if (user?._id) await User.deleteOne({ _id: user._id }).catch(() => {});
          addError(summary, record, rowError.code === 11000 ? "Email already exists" : "Row could not be saved");
        }
      }

      await require("../services/departmentAccess").audit(
        req.user, "alumni.imported", extension.slice(1), req.user.department,
        { imported: summary.imported, skipped: summary.skipped, sheets: summary.sheets.map((sheet) => sheet.name) },
      );
      require("../services/discoveryPolicy").invalidateDiscovery();
      return res.status(201).json({
        status: "success", message: "Bulk import completed",
        data: { ...summary, errorsTruncated: summary.errorCount > summary.errors.length },
      });
    } catch (importError) {
      console.error("Bulk import failed:", importError);
      return res.status(500).json({ status: "fail", message: "Unable to process the import file" });
    }
  });
};

module.exports = { bulkImport };
