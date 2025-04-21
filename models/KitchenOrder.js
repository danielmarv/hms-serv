import mongoose from 'mongoose';

const kitchenItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: { type: Number, required: true },
  notes: String,
  status: {
    type: String,
    enum: ['Pending', 'Cooking', 'Ready', 'Served'],
    default: 'Pending'
  }
});

const kitchenOrderSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  items: [kitchenItemSchema],
  priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

export default mongoose.model('KitchenOrder', kitchenOrderSchema);
