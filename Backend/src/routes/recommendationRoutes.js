const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/checkAuth");
const RecommendationFeedback = require("../models/recommendationFeedbackModel");
const cache = require("../services/cacheService");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

router.use(checkAuth);

router.get("/evaluation", (req, res) => {
  const report = require("../data/recommendationBenchmark.json");
  return res.status(200).json({ status: "success", data: report });
});

router.post("/recommendations", async (req, res) => {
  try {
    const { topN, algorithm, mode = "network" } = req.body;
    if (!["network", "mentor", "referral"].includes(mode)) {
      return res.status(400).json({ status: "fail", message: "Invalid recommendation mode" });
    }
    const normalizedTopN = Math.min(Math.max(Number(topN) || 10, 1), 50);
    const cacheKey = `recommendations:${req.user._id}:${mode}:${normalizedTopN}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, cached: true });
    }
    let endpoint = "/recommend";

    if (algorithm === "knn") endpoint = "/recommend/knn";
    else if (algorithm === "combined") endpoint = "/recommend/combined";

    const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: req.user._id, topN: normalizedTopN, mode }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    cache.set(cacheKey, data, 60_000);
    return res.status(200).json(data);
  } catch (error) {
    console.error("ML service error:", error);
    return res.status(500).json({ status: "fail", message: "ML service unavailable" });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const {
      recommendedUserId,
      mode = "network",
      action,
      score,
      modelVersion = "unknown",
    } = req.body;
    const allowedActions = [
      "relevant",
      "not_relevant",
      "hidden",
      "connected",
      "mentorship_requested",
    ];
    if (!recommendedUserId || !allowedActions.includes(action)) {
      return res.status(400).json({ status: "fail", message: "Valid recommendation and action are required" });
    }
    if (recommendedUserId === req.user._id.toString()) {
      return res.status(400).json({ status: "fail", message: "Self-feedback is not allowed" });
    }
    const feedback = await RecommendationFeedback.findOneAndUpdate(
      { viewer: req.user._id, recommendedUser: recommendedUserId, mode },
      { action, score, modelVersion },
      { new: true, upsert: true, runValidators: true }
    );
    cache.removeByPrefix(`recommendations:${req.user._id}:`);
    return res.status(200).json({ status: "success", data: { feedback } });
  } catch (error) {
    console.error("Recommendation feedback error:", error);
    return res.status(500).json({ status: "fail", message: "Unable to save feedback" });
  }
});

module.exports = router;
