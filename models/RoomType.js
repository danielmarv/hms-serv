import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: String,

  // Pricing
  base_price: { type: Number, required: true },
  weekend_price: Number,
  holiday_price: Number,
  hourly_rate: Number,
  currency: { type: String, default: 'USD' },

  // Configuration
  max_occupancy: Number,
  number_of_beds: Number,
  bed_type: {
    type: String,
    enum: ['single', 'double', 'queen', 'king', 'twin', 'sofa', 'bunk']
  },

  // Amenities
  amenities: [String],
  has_balcony: Boolean,
  has_kitchen: Boolean,
  is_pet_friendly: Boolean,
  has_wifi: Boolean,
  has_tv: Boolean,
  has_air_conditioning: Boolean,
  has_workspace: Boolean,

  // Category
  category: {
    type: String,
    enum: ['standard', 'deluxe', 'suite', 'presidential', 'family', 'studio']
  },

  // Group Pricing
  group_pricing: [
    {
      group_name: String,
      custom_price: Number
    }
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('RoomType', roomTypeSchema);
