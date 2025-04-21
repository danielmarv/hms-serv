// models/InventoryItem.js
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['food', 'beverage', 'cleaning', 'linen', 'electronics', 'furniture', 'stationery', 'others'],
    required: true
  },
  quantity_in_stock: {
    type: Number,
    default: 0
  },
  reorder_level: Number,
  unit: {
    type: String, // e.g. kg, liter, pcs
    required: true
  },
  price_per_unit: Number,
  total_value: Number, // auto-calculated
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  location: String, // e.g. Main Store, Kitchen, Housekeeping

  is_active: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

inventoryItemSchema.pre('save', function (next) {
  this.total_value = this.quantity_in_stock * this.price_per_unit;
  next();
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export default InventoryItem;
