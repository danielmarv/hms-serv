import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  check_in: { type: Date, required: true },
  check_out: { type: Date, required: true },

  number_of_guests: Number,
  booking_source: String, // e.g., walk-in, website, agent
  payment_status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  payment_method: String,
  total_amount: Number,
  special_requests: String,
  status: {
    type: String,
    enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'],
    default: 'confirmed'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
