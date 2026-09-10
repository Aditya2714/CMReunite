const crypto = require("crypto");

const requestContext = (req, res, next) => {
  const startedAt = Date.now();
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  res.on("finish", () => {
    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? "error" : "info",
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }));
  });
  next();
};

module.exports = requestContext;
