const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      status: "fail",
      message: "You do not have permission to perform this action",
    });
  }
  return next();
};

module.exports = allowRoles;
