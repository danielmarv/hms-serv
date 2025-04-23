import Permission from '../models/Permission.js';

// Create Permission
export const createPermission = async (req, res) => {
  try {
    const { key, description } = req.body;

    const permissionExists = await Permission.findOne({ key: key.toLowerCase() });
    if (permissionExists) return res.status(400).json({ message: 'Permission already exists' });

    const permission = new Permission({
      key: key.toLowerCase(),
      description
    });

    await permission.save();

    res.status(201).json({ message: 'Permission created', permission });
  } catch (err) {
    res.status(500).json({ message: 'Permission creation failed', error: err.message });
  }
};

// Get All Permissions
export const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.status(200).json(permissions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get permissions', error: err.message });
  }
};

// Update Permission
export const updatePermission = async (req, res) => {
  const { id } = req.params;
  const { key, description } = req.body;

  try {
    const permission = await Permission.findByIdAndUpdate(
      id,
      { key: key.toLowerCase(), description },
      { new: true }
    );

    if (!permission) return res.status(404).json({ message: 'Permission not found' });

    res.status(200).json({ message: 'Permission updated', permission });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update permission', error: err.message });
  }
};

// Delete Permission
export const deletePermission = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await Permission.findByIdAndDelete(id);
    if (!permission) return res.status(404).json({ message: 'Permission not found' });

    res.status(200).json({ message: 'Permission deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete permission', error: err.message });
  }
};
