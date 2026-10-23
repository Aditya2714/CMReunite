const crypto = require("crypto");

const requestContext = (req, res, next) => {
  const startedAt = Date.now();
  const requestPath = req.path;
  req.id = (/^[a-f0-9-]{36}$/i.test(String(req.headers["x-request-id"] || "")) ? req.headers["x-request-id"] : crypto.randomUUID());
  res.setHeader("X-Request-Id", req.id);
  res.on("finish", () => {
    if (!requestPath.startsWith("/health") && !requestPath.startsWith("/internal")) require("../services/metrics").recordRequest(res.statusCode, Date.now() - startedAt);
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? "error" : "info",
      requestId: req.id,
      method: req.method,
      path: requestPath,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }));
  });
  require("../utils/operationalLog").context.run({ requestId: req.id }, next);
};

module.exports = requestContext;
