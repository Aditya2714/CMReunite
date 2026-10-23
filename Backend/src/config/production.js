const fs = require("node:fs");
const loadSecrets = (env = process.env) => {
  for (const key of ["JWT_SECRET", "CSRF_SECRET", "MONGODB_URI", "SMTP_PASSWORD", "EMAIL_PASS", "MONITOR_TOKEN"]) {
    if (env[`${key}_FILE`]) env[key] = fs.readFileSync(env[`${key}_FILE`], "utf8").trim();
  }
};
const validateProduction = (env = process.env) => {
  if (env.NODE_ENV !== "production") return;
  const fail = (name) => { throw new Error(`Invalid production configuration: ${name}`); };
  for (const key of ["JWT_SECRET", "CSRF_SECRET"]) if (!env[key] || env[key].length < 32 || /replace|example|change.?me/i.test(env[key])) fail(key);
  if (env.JWT_SECRET === env.CSRF_SECRET) fail("separate JWT and CSRF secrets required");
  const urls = ["FRONTEND_URL", "PUBLIC_API_URL"];
  for (const name of urls) {
    let url; try { url = new URL(env[name]); } catch { fail(name); }
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) fail(name);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && env.LOCAL_PRODUCTION_QA !== "true") fail(name);
  }
  if (new URL(env.FRONTEND_URL).origin !== new URL(env.PUBLIC_API_URL).origin) fail("one public origin required");
  if (env.CORS_ORIGIN !== new URL(env.FRONTEND_URL).origin) fail("CORS_ORIGIN");
  if (!/^mongodb(?:\+srv)?:\/\/[^/]+@/.test(env.MONGODB_URI || "")) fail("authenticated MONGODB_URI required");
  if (!env.ML_SERVICE_URL || !env.TRUST_PROXY || /^(true|\d+|\*)$/.test(env.TRUST_PROXY)) fail("ML_SERVICE_URL and explicit TRUST_PROXY ranges required");
  if (env.PLACEMENT_JOB_EMAIL_ENABLED === "true" && (!env.PLACEMENT_OFFICE_EMAIL || !env.EMAIL_USER || !(env.SMTP_PASSWORD || env.EMAIL_PASS))) fail("placement email credentials");
  if (env.SMTP_HOST && (!Number.isInteger(Number(env.SMTP_PORT || 587)) || Number(env.SMTP_PORT || 587) < 1 || Number(env.SMTP_PORT || 587) > 65535)) fail("SMTP_PORT");
  if (env.SMTP_HOST && env.SMTP_REQUIRE_TLS !== "true") fail("SMTP_REQUIRE_TLS");
  if (env.SMTP_HOST && (!env.EMAIL_USER || !(env.SMTP_PASSWORD || env.EMAIL_PASS))) fail("SMTP credentials");
};
module.exports = { loadSecrets, validateProduction };
