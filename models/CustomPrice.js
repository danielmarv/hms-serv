import mongoose from "mongoose"

const customPriceSchema = new mongoose.Schema(
  {
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      enum: ["None", "WeekendOnly", "WeekdayOnly", "Holiday", "GroupBooking", "Corporate", "Promotion", "Seasonal"],
      default: "None",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    minimumStay: {
      type: Number,
      default: 1,
      min: 1,
    },
    maximumStay: {
      type: Number,
      default: 0, // 0 means no maximum
    },
    daysInAdvance: {
      type: Number,
      default: 0, // 0 means no restriction
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    applyToExistingBookings: {
      type: Boolean,
      default: false,
    },
    restrictedToChannels: [String],
    restrictedToMarkets: [String],
    priority: {
      type: Number,
      default: 0, // Higher number means higher priority
    },
    code: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Validate date range
customPriceSchema.path("startDate").validate(function (value) {
  return value < this.endDate
}, "Start date must be before end date")

// Validate minimum and maximum stay
customPriceSchema.path("maximumStay").validate(function (value) {
  return value === 0 || value >= this.minimumStay
}, "Maximum stay must be greater than or equal to minimum stay")

// Index for faster queries
customPriceSchema.index({ roomType: 1, startDate: 1, endDate: 1 })
customPriceSchema.index({ isActive: 1 })

const CustomPrice = mongoose.model("CustomPrice", customPriceSchema)
export default CustomPrice
