function authenticateUser(req, res, next) {
  // Support role passing via headers (e.g. x-user-role) or query/body for demo usability
  const role = req.headers['x-user-role'] || 'Admin';
  const username = req.headers['x-username'] || (role === 'Admin' ? 'admin' : role === 'Warehouse Manager' ? 'manager' : 'staff');

  req.user = {
    username,
    role,
    full_name: role === 'Admin' ? 'Sarah Jenkins (Admin)' : role === 'Warehouse Manager' ? 'David Miller (Warehouse Mgr)' : 'Alex Rodriguez (Staff)'
  };

  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized to perform this action. Required: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateUser,
  requireRole
};
