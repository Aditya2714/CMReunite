const mongoose = require("mongoose");
const { getQueueStatus } = require("../services/jobQueue");

const getHealth = async (req, res) => {
  const database = mongoose.connection.readyState === 1 ? "connected" : "unavailable";
  let mlService = "unavailable";
  try {
    const response = await fetch(
      `${process.env.ML_SERVICE_URL || "http://127.0.0.1:5001"}/health`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (response.ok) mlService = "connected";
  } catch {
    mlService = "unavailable";
  }
  const healthy = database === "connected";
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "alumni-connect-backend",
    version: process.env.APP_VERSION || "development",
    database,
    mlService,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    requestId: req.id,
    backgroundJobs: getQueueStatus(),
  });
};

module.exports = { getHealth };
