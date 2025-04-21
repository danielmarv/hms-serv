import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  room_type: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },

  floor: String,
  building: String,
  view: { type: String, enum: ['sea', 'mountain', 'city', 'garden', 'courtyard', 'none'] },

  is_smoking_allowed: { type: Boolean, default: false },
  is_accessible: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'cleaning', 'reserved', 'out_of_order'],
    default: 'available'
  },

  price_override: Number,

  minibar_items: [String],
  connected_rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],

  branch: { type: String },

  has_smart_lock: Boolean,
  automation_settings: {
    air_conditioner: Boolean,
    smart_lighting: Boolean,
    keyless_entry: Boolean
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
