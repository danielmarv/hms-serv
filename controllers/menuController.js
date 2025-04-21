import MenuItem from '../models/MenuItem.js';

export const addMenuItem = async (req, res) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ availability: true });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
