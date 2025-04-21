import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate('role')
      .populate('custom_permissions');

    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    req.user.permissions = await user.getEffectivePermissions();
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
};

export const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(403).json({ message: 'Forbidden: No permissions loaded' });
    }

    const hasPermission = requiredPermissions.every(p => req.user.permissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
