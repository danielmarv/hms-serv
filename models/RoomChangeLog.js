import mongoose from 'mongoose';

const roomChangeSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    from_room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    to_room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now }
  });
  
  export default mongoose.model('RoomChangeLog', roomChangeSchema);
  