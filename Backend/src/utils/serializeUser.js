const cleanObject = (document) => {
  if (!document) return null;
  const value = typeof document.toObject === "function" ? document.toObject() : document;
  const { password, ...safeValue } = value;
  return safeValue;
};

const serializeUser = (user, profile = null) => ({
  ...(profile ? cleanObject(profile) : {}),
  id: user._id,
  user: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isApproved: user.isApproved,
  approvalStatus: user.approvalStatus,
  privacy: user.privacy,
  department: user.department,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  password: undefined,
});

module.exports = { cleanObject, serializeUser };
