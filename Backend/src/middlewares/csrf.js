const crypto = require("node:crypto");
const { doubleCsrf } = require("csrf-csrf");
const production = process.env.NODE_ENV === "production";
const cookieOptions = { httpOnly: true, secure: production, sameSite: "lax", path: "/" };
const nonceName = production ? "__Host-cm-browser" : "cm-browser";
const tokenName = production ? "__Host-cm-csrf" : "cm-csrf";
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  getSessionIdentifier: (req) => req.cookies.jwt || req.cookies[nonceName] || "",
  cookieName: tokenName, cookieOptions,
  getCsrfTokenFromRequest: (req) => req.get("X-CSRF-Token"),
});
const issue = (req, res) => {
  if (!req.cookies[nonceName]) {
    req.cookies[nonceName] = crypto.randomBytes(32).toString("hex");
    res.cookie(nonceName, req.cookies[nonceName], cookieOptions);
  }
  res.set("Cache-Control", "no-store");
  let csrfToken;
  try { csrfToken = generateCsrfToken(req, res); }
  catch { csrfToken = generateCsrfToken(req, res, { overwrite: true }); }
  res.json({ status: "success", data: { csrfToken } });
};
const rotate = (res) => { res.clearCookie(tokenName, cookieOptions); res.clearCookie(nonceName, cookieOptions); };
const protect = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",");
  const origin = req.get("Origin");
  if (origin && !origins.includes(origin)) return res.status(403).json({ status: "fail", code: "ORIGIN_DENIED", message: "Request origin is not permitted" });
  if (!req.cookies.jwt && /^Bearer .+/.test(req.get("Authorization") || "")) return next();
  // Cookie-free non-browser clients remain compatible. Browser and ambient-cookie requests are protected.
  if (!origin && !req.get("Sec-Fetch-Site") && !req.cookies.jwt && !req.cookies[nonceName] && !req.cookies[tokenName]) return next();
  doubleCsrfProtection(req, res, (error) => error ? res.status(403).json({ status: "fail", code: "CSRF_INVALID", message: "Your security token expired. Please try again." }) : next());
};
module.exports = { issue, rotate, protect };
