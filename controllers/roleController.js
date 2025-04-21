import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

// Create Role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const roleExists = await Role.findOne({ name: name.toLowerCase() });
    if (roleExists) return res.status(400).json({ message: 'Role already exists' });

    const role = new Role({
      name: name.toLowerCase(),
      description,
      permissions,
      createdBy: req.user._id
    });

    await role.save();

    res.status(201).json({ message: 'Role created', role });
  } catch (err) {
    res.status(500).json({ message: 'Role creation failed', error: err.message });
  }
};

// Get All Roles
export const getRoles = async (req, res) => {
  const roles = await Role.find().populate('permissions');
  res.status(200).json(roles);
};

// Update Role
export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  try {
    const role = await Role.findByIdAndUpdate(
      id,
      { name, description, permissions, updatedBy: req.user._id },
      { new: true }
    ).populate('permissions');

    if (!role) return res.status(404).json({ message: 'Role not found' });

    res.status(200).json({ message: 'Role updated', role });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update role', error: err.message });
  }
};

// Delete Role
export const deleteRole = async (req, res) => {
  const { id } = req.params;

  try {
    const role = await Role.findByIdAndDelete(id);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete role', error: err.message });
  }
};
