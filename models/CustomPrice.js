import mongoose from 'mongoose';

const customPriceSchema = new mongoose.Schema({
  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomType',
    required: true
  },
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  price: { type: Number, required: true },
  condition: {
    type: String,
    enum: ['None', 'WeekendOnly', 'WeekdayOnly', 'Holiday', 'GroupBooking'],
    default: 'None'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CustomPrice', customPriceSchema);
