import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  issue_description: { type: String, required: true },
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'unresolved'],
    default: 'pending'
  },
  resolution_notes: String,
  cost_estimate: Number,
  actual_cost: Number,
  resolved_at: Date,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Maintenance', maintenanceSchema);
