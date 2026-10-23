const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const Connection = require("../models/connectionModel");
const cache = require("./cacheService");
const eligible = (account) => !!account && account.role === "alumni" && account.isActive !== false && account.isApproved === true && !["pending", "rejected"].includes(account.approvalStatus);
const id = (value) => String(value?._id || value || "");
const visible = (viewer, account, connected, { includeSelf = false, purpose = "discovery" } = {}) => {
  if (!eligible(account)) return false;
  if (id(viewer) === id(account)) return includeSelf;
  if ((viewer.blockedUsers || []).some((value) => id(value) === id(account)) || (account.blockedUsers || []).some((value) => id(value) === id(viewer))) return false;
  const visibility = account.privacy?.profileVisibility || "members";
  if (visibility === "private" || (visibility === "network" && !connected.has(id(account)))) return false;
  if (purpose === "connect" && account.privacy?.allowConnections === false) return false;
  if (purpose === "mentor" && account.privacy?.mentorshipAvailable === false) return false;
  return true;
};
const connectedIds = async (viewer) => new Set((await Connection.find({ status: "accepted", $or: [{ requester: viewer._id }, { recipient: viewer._id }] }).select("requester recipient").lean()).map((item) => id(item.requester) === id(viewer) ? id(item.recipient) : id(item.requester)));
const eligibleAccounts = async (viewer, options = {}) => {
  const connected = await connectedIds(viewer);
  const accounts = await User.find({ role: "alumni", isActive: { $ne: false }, isApproved: true, approvalStatus: { $nin: ["pending", "rejected"] } }).select("_id role isActive isApproved approvalStatus privacy blockedUsers").lean();
  return accounts.filter((account) => visible(viewer, account, connected, options));
};
const sanitizeProfile = (profile, account) => {
  const safe = typeof profile.toObject === "function" ? profile.toObject() : { ...profile };
  if (!account?.privacy?.showEmail) safe.email = "";
  if (!account?.privacy?.showPhone) { delete safe.mobileNumber; delete safe.phone; }
  delete safe.password; delete safe.verificationNote; delete safe.verificationStatus; delete safe.verifiedBy;
  return safe;
};
const visibleProfiles = async (viewer, options = {}, filter = {}) => {
  const accounts = await eligibleAccounts(viewer, options), byId = new Map(accounts.map((account) => [id(account), account]));
  const profiles = await Alumni.find({ $and: [filter, { user: { $in: accounts.map((account) => account._id) } }] }).lean();
  return profiles.map((profile) => sanitizeProfile(profile, byId.get(id(profile.user))));
};
const requireVisibleProfile = async (viewer, profileId, purpose) => {
  const profiles = await visibleProfiles(viewer, { purpose }, { _id: profileId });
  if (!profiles.length) throw Object.assign(new Error("Alumni profile not found or unavailable"), { status: 404 });
  return profiles[0];
};
const invalidateDiscovery = () => cache.removeByPrefix("recommendations:");
module.exports = { eligible, visible, connectedIds, eligibleAccounts, sanitizeProfile, visibleProfiles, requireVisibleProfile, invalidateDiscovery };
