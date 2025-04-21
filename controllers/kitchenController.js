import KitchenOrder from '../models/KitchenOrder.js';

export const addKitchenOrder = async (req, res) => {
  try {
    const kitchenOrder = new KitchenOrder(req.body);
    await kitchenOrder.save();
    res.status(201).json(kitchenOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateKitchenItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const ko = await KitchenOrder.findById(id);
    if (!ko) return res.status(404).json({ message: 'Not found' });

    ko.items = items;
    ko.updatedAt = new Date();
    await ko.save();

    res.status(200).json(ko);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
