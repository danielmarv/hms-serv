import Permission from '../models/Permission.js';

// Create Permission
export const createPermission = async (req, res) => {
  try {
    const { key, description } = req.body;

    const exists = await Permission.findOne({ key: key.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Permission already exists' });

    const permission = await Permission.create({ key: key.toLowerCase(), description });
    res.status(201).json({ message: 'Permission created', permission });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create permission', error: err.message });
  }
};

// Get all Permissions
export const getPermissions = async (req, res) => {
  const permissions = await Permission.find();
  res.status(200).json(permissions);
};

// Delete a Permission
export const deletePermission = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await Permission.findByIdAndDelete(id);
    if (!permission) return res.status(404).json({ message: 'Permission not found' });

    res.status(200).json({ message: 'Permission deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete permission', error: err.message });
  }
};
