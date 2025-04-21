import InventoryItem from '../models/InventoryItem.js';
import StockTransaction from '../models/StockTransaction.js';

// Add inventory item
export const createItem = async (req, res) => {
  const item = await InventoryItem.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(item);
};

// Get all inventory items
export const getItems = async (req, res) => {
  const items = await InventoryItem.find();
  res.json(items);
};

// Update inventory item
export const updateItem = async (req, res) => {
  const updated = await InventoryItem.findByIdAndUpdate(req.params.id, {
    ...req.body,
    updatedBy: req.user._id
  }, { new: true });
  res.json(updated);
};

// Disable item
export const disableItem = async (req, res) => {
  const updated = await InventoryItem.findByIdAndUpdate(req.params.id, {
    is_active: false,
    updatedBy: req.user._id
  }, { new: true });
  res.json(updated);
};

// Stock transactions (in or out)
export const createTransaction = async (req, res) => {
  const { item, type, quantity } = req.body;

  const inventoryItem = await InventoryItem.findById(item);
  if (!inventoryItem) return res.status(404).json({ error: 'Item not found' });

  inventoryItem.current_quantity += type === 'in' ? quantity : -quantity;
  await inventoryItem.save();

  const transaction = await StockTransaction.create({
    ...req.body,
    performedBy: req.user._id
  });

  res.status(201).json(transaction);
};

// Low stock alerts
export const getLowStockItems = async (req, res) => {
  const items = await InventoryItem.find({ current_quantity: { $lte: "$reorder_level" } });
  res.json(items);
};
