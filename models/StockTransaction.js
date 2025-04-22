
import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  type: {
    type: String,
    enum: ['restock', 'usage', 'wastage', 'transfer', 'return'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit_price: Number,
  total_cost: Number,
  transaction_date: {
    type: Date,
    default: Date.now
  },
  department: {
    type: String, // e.g. Kitchen, Housekeeping
  },
  remarks: String,

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

stockTransactionSchema.pre('save', function (next) {
  this.total_cost = this.quantity * this.unit_price;
  next();
});

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
export default StockTransaction;
