const { failure } = require("../utils/operationalLog");
const idKeys = new Set(["id", "userId", "alumniId", "conversationId", "topicId", "requestId", "campaignId", "referralId", "sessionId"]);
module.exports = (handler) => (req, res, next) => {
  for (const [key, value] of Object.entries(req.params || {})) {
    if (idKeys.has(key) && !/^[a-f0-9]{24}$/i.test(value)) return res.status(400).json({ status: "fail", message: "Invalid record ID" });
  }
  return Promise.resolve().then(() => handler(req, res, next)).catch(next);
};
module.exports.errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  failure("request.failed", error);
  const status = error.code === 11000 ? 409 : ["CastError", "ValidationError", "MulterError"].includes(error.name) ? 400 : error.type === "entity.parse.failed" ? 400 : error.status >= 400 && error.status < 500 ? error.status : 500;
  const message = status === 500 ? "Internal Server Error" : status === 409 ? "Record already exists" : status === 400 ? (error.expose === true ? error.message : "Invalid request data") : error.message;
  return res.status(status).json({ status: "fail", message });
};
