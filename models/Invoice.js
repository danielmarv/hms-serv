// models/Invoice.js
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  invoice_number: {
    type: String,
    unique: true,
    required: true
  },
  issued_date: {
    type: Date,
    default: Date.now
  },
  due_date: Date,

  items: [{
    description: String,
    quantity: { type: Number, default: 1 },
    unit_price: Number,
    total: Number // computed as quantity * unit_price
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

  subtotal: Number,
  total: Number,
  currency: {
    type: String,
    default: 'USD'
  },

  status: {
    type: String,
    enum: ['unpaid', 'paid', 'partial', 'cancelled', 'refunded'],
    default: 'unpaid'
  },

  notes: String,

  payment_method: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'mobile_money', 'bank_transfer', 'online'],
  },

  paid_date: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
