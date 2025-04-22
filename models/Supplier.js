// models/Supplier.js
import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contact_person: String,
  phone: String,
  email: String,
  address: String,
  supplies: [String],

  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
