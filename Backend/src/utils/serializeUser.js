const cleanObject = (document) => {
  if (!document) return null;
  const value = typeof document.toObject === "function" ? document.toObject() : document;
  const { password, ...safeValue } = value;
  return safeValue;
};

const serializeUser = (user, profile = null) => ({
  id: user._id,
  user: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isApproved: user.isApproved,
  approvalStatus: user.approvalStatus,
  privacy: user.privacy,
  ...(profile ? cleanObject(profile) : {}),
  password: undefined,
});

module.exports = { cleanObject, serializeUser };
