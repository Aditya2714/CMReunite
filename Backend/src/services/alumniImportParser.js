const ExcelJS = require("exceljs");

const normalizeHeader = (value = "") => String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const aliases = {
  fullName: ["name", "full name", "alumni name"],
  firstName: ["first name", "firstName"],
  lastName: ["last name", "lastName"],
  email: ["email", "email id", "email address", "mail"],
  phone: ["contact information", "contact no", "contact details", "mobile number", "phone"],
  startYear: ["start year", "startYear"],
  endYear: ["graduating year", "graduated batch", "grduated batch", "batch", "passing year", "end year", "endYear"],
  degree: ["degree", "course", "highest education"],
  branch: ["branch", "department"],
  rollNumber: ["roll number", "rollNumber", "usn", "student id"],
  linkedin: ["linkedin profile link", "linkedin", "linkedin url"],
  designation: ["current working designation", "current profession", "working position", "designation", "job title"],
  company: ["employee/ entreprenur details", "employee/ entrepreneur details", "company", "employer"],
  location: ["address details if any", "address deatils if any", "address", "location", "city"],
  password: ["password"],
  domain: ["domain", "working domain"],
};

const normalizedAliases = Object.fromEntries(
  Object.entries(aliases).map(([field, names]) => [field, names.map(normalizeHeader)]),
);
const knownHeaders = new Set(Object.values(normalizedAliases).flat());

const parseCsv = (content) => {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];
    if (char === "\"" && insideQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") insideQuotes = !insideQuotes;
    else if (char === "," && !insideQuotes) {
      row.push(current.trim()); current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; current = "";
    } else current += char;
  }
  if (current || row.length) {
    row.push(current.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
};

const headerMapFor = (row) => row.reduce((map, header, index) => {
  const normalized = normalizeHeader(header);
  if (normalized && map[normalized] === undefined) map[normalized] = index;
  return map;
}, {});

const fieldIndex = (headerMap, field) => {
  for (const name of normalizedAliases[field]) {
    if (headerMap[name] !== undefined) return headerMap[name];
  }
  return undefined;
};

const fieldValue = (row, headerMap, field) => {
  const index = fieldIndex(headerMap, field);
  return index === undefined ? "" : String(row[index] ?? "").trim();
};

const standardize = (row, headerMap, metadata) => ({
  ...metadata,
  fullName: fieldValue(row, headerMap, "fullName"),
  firstName: fieldValue(row, headerMap, "firstName"),
  lastName: fieldValue(row, headerMap, "lastName"),
  email: fieldValue(row, headerMap, "email"),
  phone: fieldValue(row, headerMap, "phone"),
  startYear: fieldValue(row, headerMap, "startYear"),
  endYear: fieldValue(row, headerMap, "endYear"),
  degree: fieldValue(row, headerMap, "degree"),
  branch: fieldValue(row, headerMap, "branch"),
  rollNumber: fieldValue(row, headerMap, "rollNumber"),
  linkedin: fieldValue(row, headerMap, "linkedin"),
  designation: fieldValue(row, headerMap, "designation"),
  company: fieldValue(row, headerMap, "company"),
  location: fieldValue(row, headerMap, "location"),
  password: fieldValue(row, headerMap, "password"),
  domain: fieldValue(row, headerMap, "domain"),
});

const inferDepartmentHint = (worksheet, rowsBeforeHeader) => {
  const sheetName = worksheet.name.trim();
  const normalizedSheet = normalizeHeader(sheetName);
  if (!/^sheet\d*$/.test(normalizedSheet) && !/batchalumnidata/.test(normalizedSheet)) return sheetName;
  const title = rowsBeforeHeader.flat().join(" ");
  const match = title.match(/department\s+of\s+([a-z0-9&_-]+)/i);
  return match?.[1] || "";
};

const cellText = (cell) => {
  const value = cell.isMerged ? cell.master?.value : cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim();
    if (value.result !== undefined) return String(value.result ?? "").trim();
    if (value.text !== undefined) return String(value.text ?? "").trim();
    if (value.hyperlink !== undefined) return String(value.text || value.hyperlink || "").trim();
  }
  return String(value).trim();
};

const parseWorkbook = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const records = [];
  const sheets = [];

  workbook.eachSheet((worksheet) => {
    const scanLimit = Math.min(15, worksheet.rowCount);
    let headerRowNumber = 0;
    let header = [];
    for (let number = 1; number <= scanLimit; number += 1) {
      const candidate = worksheet.getRow(number).values.slice(1).map((value, index) => cellText(worksheet.getCell(number, index + 1)) || String(value ?? "").trim());
      const score = candidate.filter((value) => knownHeaders.has(normalizeHeader(value))).length;
      if (score >= 3) { headerRowNumber = number; header = candidate; break; }
    }
    if (!headerRowNumber) {
      sheets.push({ name: worksheet.name, importedRows: 0, issue: "Header row not found" });
      return;
    }

    const before = [];
    for (let number = 1; number < headerRowNumber; number += 1) {
      before.push(worksheet.getRow(number).values.slice(1).map((_, index) => cellText(worksheet.getCell(number, index + 1))));
    }
    const departmentHint = inferDepartmentHint(worksheet, before);
    const headerMap = headerMapFor(header);
    const nameHeader = fieldIndex(headerMap, "fullName");
    const nextHeader = normalizeHeader(header[nameHeader + 1]);
    if (nameHeader !== undefined && (!nextHeader || normalizedAliases.fullName.includes(nextHeader))) {
      let currentValues = 0;
      let nextValues = 0;
      for (let number = headerRowNumber + 1; number <= Math.min(headerRowNumber + 12, worksheet.rowCount); number += 1) {
        if (cellText(worksheet.getCell(number, nameHeader + 1))) currentValues += 1;
        if (cellText(worksheet.getCell(number, nameHeader + 2))) nextValues += 1;
      }
      if (nextValues >= 1 && nextValues > currentValues) headerMap[normalizedAliases.fullName[0]] = nameHeader + 1;
    }

    let sheetRecords = 0;
    for (let number = headerRowNumber + 1; number <= worksheet.rowCount; number += 1) {
      const row = [];
      for (let column = 1; column <= worksheet.actualColumnCount; column += 1) row.push(cellText(worksheet.getCell(number, column)));
      const record = standardize(row, headerMap, { sourceSheet: worksheet.name, sourceLine: number, departmentHint });
      if (![record.fullName, record.firstName, record.email, record.endYear].some(Boolean)) continue;
      records.push(record);
      sheetRecords += 1;
    }
    sheets.push({ name: worksheet.name, departmentHint: departmentHint || null, importedRows: sheetRecords });
  });
  return { records, sheets };
};

const parseCsvRecords = (buffer) => {
  const rows = parseCsv(buffer.toString("utf8"));
  if (rows.length < 2) return { records: [], sheets: [{ name: "CSV", importedRows: 0 }] };
  const headerMap = headerMapFor(rows[0]);
  return {
    records: rows.slice(1).map((row, index) => standardize(row, headerMap, {
      sourceSheet: "CSV", sourceLine: index + 2, departmentHint: fieldValue(row, headerMap, "branch"),
    })),
    sheets: [{ name: "CSV", importedRows: rows.length - 1 }],
  };
};

module.exports = { parseWorkbook, parseCsvRecords, normalizeHeader };
