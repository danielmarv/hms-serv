import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,

  items: [{
    description: String,
    quantity: { type: Number, default: 1 },
    unitPrice: Number,
    total: Number // Auto-calculated elsewhere: quantity * unitPrice
  }],

  taxes: [{
    name: String,
    percentage: Number,
    amount: Number
  }],

  discounts: [{
    description: String,
    amount: Number
  }],

  subtotal: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },

  status: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Partial', 'Cancelled', 'Refunded'],
    default: 'Unpaid'
  },

  notes: String,

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Debit Card', 'Mobile Money', 'Bank Transfer', 'Online']
  },

  paidDate: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
