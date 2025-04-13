import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

// Get all users with filtering, searching & pagination
export const getAllUsers = async (req, res) => {
  const { status, role, search, page = 1, limit = 20 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { full_name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') }
    ];
  }

  const users = await User.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('role')
    .populate('custom_permissions');

  const total = await User.countDocuments(query);

  res.json({ users, total, page: +page });
};

// Get single user
export const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('role')
    .populate('custom_permissions');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json(user);
};

// Create a user
export const createUser = async (req, res) => {
  const {
    full_name, email, password, phone, gender, dob,
    national_id, address, department, job_title, branch,
    role, custom_permissions, status
  } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already exists' });

  const user = new User({
    full_name,
    email,
    password,
    phone,
    gender,
    dob,
    national_id,
    address,
    department,
    job_title,
    branch,
    role,
    custom_permissions,
    status,
    createdBy: req.user?._id
  });

  await user.save();
  res.status(201).json(user);
};

// Update user info
export const updateUser = async (req, res) => {
  const updateFields = {
    ...req.body,
    updatedBy: req.user?._id
  };

  if (updateFields.password) {
    delete updateFields.password; // handled separately
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true })
    .populate('role')
    .populate('custom_permissions');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json(user);
};

// Update user password
export const updateUserPassword = async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.password = password;
  await user.save();

  res.json({ message: 'Password updated successfully' });
};

// Delete user
export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ message: 'User deleted successfully' });
};

// Change status
export const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.status = status;
  await user.save();

  res.json({ message: 'User status updated' });
};

// Assign role
export const assignRoleToUser = async (req, res) => {
  const { roleId } = req.body;
  const user = await User.findById(req.params.id);
  const role = await Role.findById(roleId);

  if (!user || !role) return res.status(404).json({ message: 'User or role not found' });

  user.role = role._id;
  await user.save();

  res.json({ message: 'Role assigned' });
};

// Assign custom permissions
export const assignCustomPermissions = async (req, res) => {
  const { permissionIds } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  user.custom_permissions = permissionIds;
  await user.save();

  res.json({ message: 'Permissions updated' });
};
