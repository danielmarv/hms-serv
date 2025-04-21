import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  section: String,
  capacity: Number,
  occupied: { type: Boolean, default: false },
});

export default mongoose.model('Table', tableSchema);
