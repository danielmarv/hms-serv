import Order from '../models/Order.js';

export const createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('items.menuItem table');
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
