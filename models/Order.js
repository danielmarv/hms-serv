import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  waiter: { type: String }, // or ref to User
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    quantity: Number,
    notes: String,
    status: { type: String, enum: ['Pending', 'Prepared', 'Served'], default: 'Pending' },
  }],
  totalAmount: Number,
  orderStatus: { type: String, enum: ['Open', 'Paid', 'Cancelled'], default: 'Open' },
  orderedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Order', orderSchema);
