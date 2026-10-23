const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const router = express.Router();
const checkAuth = require("../middlewares/checkAuth");
const RecommendationFeedback = require("../models/recommendationFeedbackModel");
const cache = require("../services/cacheService");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

router.use(checkAuth);

router.get("/evaluation", asyncHandler((req, res) => {
  const report = require("../data/recommendationBenchmark.json");
  return res.status(200).json({ status: "success", data: report });
}));

const policy = require("../services/discoveryPolicy");
const revalidate = async (payload, viewer, mode) => {
  const profiles = await policy.visibleProfiles(viewer, { purpose: mode === "mentor" ? "mentor" : mode === "network" ? "connect" : "discovery" });
  const byUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const recommendations = (payload.data?.recommendations || []).filter((item) => byUser.has(String(item.userId))).map((item) => {
    const profile = byUser.get(String(item.userId));
    const safe = { id: String(profile._id), userId: String(profile.user) };
    for (const key of ["firstName", "lastName", "branch", "degree", "endYear", "company", "designation", "domain", "location", "skills", "imageUrl"]) safe[key] = profile[key];
    for (const key of ["score", "compatibility", "reasons", "signals", "mode", "modelVersion"]) safe[key] = item[key];
    return safe;
  });
  return { ...payload, data: { ...payload.data, recommendations } };
};
router.post("/recommendations", asyncHandler(async (req, res) => {
  const { topN, algorithm = "default", mode = "network" } = req.body;
  if (!["network", "mentor", "referral"].includes(mode) || !["default", "knn", "combined"].includes(algorithm)) return res.status(400).json({ status: "fail", message: "Invalid recommendation mode or algorithm" });
  if (!policy.eligible(req.user)) return res.status(403).json({ status: "fail", message: "Approved alumni access required" });
  const normalizedTopN = Math.min(Math.max(Number(topN) || 10, 1), 50);
  const cacheKey = `recommendations:${req.user._id}:${algorithm}:${mode}:${normalizedTopN}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...await revalidate(cached, req.user, mode), cached: true });
  const endpoint = algorithm === "knn" ? "/recommend/knn" : algorithm === "combined" ? "/recommend/combined" : "/recommend";
  try {
    const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: req.user._id, topN: normalizedTopN, mode }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Object.assign(new Error(), { code: "ML_UPSTREAM_ERROR" });
    const payload = await response.json();
    if (!Array.isArray(payload.data?.recommendations)) throw Object.assign(new Error(), { code: "ML_INVALID_RESPONSE" });
    const safe = await revalidate(payload, req.user, mode); cache.set(cacheKey, safe, 60000);
    return res.json(safe);
  } catch (error) {
    require("../utils/operationalLog").failure("recommendations.upstream_failed", { code: ["TimeoutError", "AbortError"].includes(error.name) ? "ML_TIMEOUT" : error.code || error.name });
    return res.status(503).json({ status: "fail", message: "Recommendations are temporarily unavailable. Please try again." });
  }
}));

router.post("/feedback", asyncHandler(async (req, res) => {
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
    if (typeof recommendedUserId !== "string" || !/^[a-f0-9]{24}$/i.test(recommendedUserId) || !allowedActions.includes(action)) {
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
    throw error;
  }
}));

module.exports = router;
