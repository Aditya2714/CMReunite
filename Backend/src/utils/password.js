const bcrypt = require("bcryptjs");

const isPasswordHash = (value = "") => value.startsWith("$2");
const hashPassword = (value) => bcrypt.hash(value, 12);
const verifyPassword = (candidate, stored) =>
  isPasswordHash(stored) ? bcrypt.compare(candidate, stored) : Promise.resolve(candidate === stored);

module.exports = { hashPassword, isPasswordHash, verifyPassword };
