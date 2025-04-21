import mongoose from 'mongoose';

const kitchenOrderSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    quantity: Number,
    status: { type: String, enum: ['Pending', 'Cooking', 'Ready'], default: 'Pending' },
  }],
  priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

export default mongoose.model('KitchenOrder', kitchenOrderSchema);
