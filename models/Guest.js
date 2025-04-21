import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, lowercase: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: Date,

  nationality: String,
  id_type: { type: String, enum: ['passport', 'national_id', 'driver_license'] },
  id_number: String,
  address: {
    street: String,
    city: String,
    country: String,
    zip: String
  },

  preferences: {
    bed_type: String,
    smoking: Boolean,
    special_requests: String
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Guest', guestSchema);
