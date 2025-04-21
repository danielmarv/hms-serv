import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dob: {
    type: Date,
    validate: {
      validator: function (v) {
        return v < new Date();
      },
      message: () => 'Date of birth must be in the past'
    }
  },

  nationality: {
    type: String,
    trim: true
  },
  id_type: {
    type: String,
    enum: ['passport', 'national_id', 'driver_license']
  },
  id_number: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    zip: { type: String, trim: true }
  },

  preferences: {
    bed_type: {
      type: String,
      enum: ['single', 'double', 'queen', 'king', 'twin', 'sofa', 'bunk']
    },
    smoking: Boolean,
    special_requests: String
  },

  loyalty_program: {
    member: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['standard', 'silver', 'gold', 'platinum'],
      default: 'standard'
    }
  },

  notes: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  versionKey: false
});

guestSchema.index({ email: 1, phone: 1 }); // For quick lookups

export default mongoose.model('Guest', guestSchema);
