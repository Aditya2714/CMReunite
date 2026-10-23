const { AsyncLocalStorage } = require("node:async_hooks");
const context = new AsyncLocalStorage();
const failure = (operation, error, ids = {}) => {
  require("../services/metrics").recordFailure(operation);
  console.error(JSON.stringify({
  level: "error", event: operation, requestId: context.getStore()?.requestId,
  errorCode: String(error?.code || error?.name || "UNEXPECTED_ERROR"),
  ...Object.fromEntries(Object.entries(ids).filter(([key]) => ["recipientId", "recordId", "notificationId"].includes(key)).map(([key, value]) => [key, String(value)])),
}));
};
module.exports = { context, failure };
