// Allow access based on required permission key
export const hasPermission = (permissionKey) => {
    return (req, res, next) => {
      if (!req.permissions.includes(permissionKey)) {
        return res.status(403).json({ message: `Forbidden: Missing permission "${permissionKey}"` });
      }
      next();
    };
  };
  
  // Allow access based on user roles
  export const hasRole = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user?.role?.name || !allowedRoles.includes(req.user.role.name)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient role' });
      }
      next();
    };
  };
  