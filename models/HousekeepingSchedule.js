import mongoose from 'mongoose';

const housekeepingSchema = new mongoose.Schema({
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    schedule_date: Date,
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    notes: String
  }, { timestamps: true });
  
  export default mongoose.model('HousekeepingSchedule', housekeepingSchema);
  