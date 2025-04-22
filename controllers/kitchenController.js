import KitchenOrder from '../models/KitchenOrder.js';
import Order from '../models/Order.js';

export const createKitchenOrder = async (req, res) => {
  try {
    const kitchenOrder = new KitchenOrder(req.body);
    await kitchenOrder.save();
    res.status(201).json(kitchenOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllKitchenOrders = async (req, res) => {
  try {
    const orders = await KitchenOrder.find()
      .populate('order')
      .populate('table')
      .populate('items.menuItem')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, menuItemId, status } = req.body;

    const kitchenOrder = await KitchenOrder.findById(orderId);
    if (!kitchenOrder) return res.status(404).json({ message: 'Order not found' });

    const item = kitchenOrder.items.find(i => i.menuItem.toString() === menuItemId);
    if (!item) return res.status(404).json({ message: 'Item not found in kitchen order' });

    item.status = status;
    kitchenOrder.updatedAt = new Date();
    await kitchenOrder.save();

    res.status(200).json(kitchenOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
