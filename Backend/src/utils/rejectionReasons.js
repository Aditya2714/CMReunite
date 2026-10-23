const REJECTION_REASONS = Object.freeze([
  { value: "usn_mismatch", label: "USN / registration number does not match college records" },
  { value: "academic_mismatch", label: "Academic details do not match college records" },
  { value: "incomplete_profile", label: "Incomplete or incorrect profile information" },
  { value: "duplicate_registration", label: "Duplicate alumni registration" },
  { value: "other", label: "Other — specify in comments" },
]);
const rejectionLabel = (code) => REJECTION_REASONS.find((item) => item.value === code)?.label || "";
const rejectionMessage = (code, comments) => [rejectionLabel(code), comments].filter(Boolean).join(". ");
module.exports = { REJECTION_REASONS, rejectionLabel, rejectionMessage };
