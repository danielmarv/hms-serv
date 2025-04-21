import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amountPaid: { type: Number, required: true },
  method: { type: String, enum: ['Cash', 'Card', 'Mobile Money'], required: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  paidAt: Date,
});

export default mongoose.model('Payment', paymentSchema);
