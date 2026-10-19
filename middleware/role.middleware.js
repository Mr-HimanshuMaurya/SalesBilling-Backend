const authorize = (...roles) => (req, res, next) => {
  const flatRoles = roles.flat();
  if (!flatRoles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied' });
  next();
}
module.exports = { authorize };
