const mongoose = require("mongoose")

const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event type name is required"],
      trim: true,
      maxlength: [100, "Event type name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    basePrice: {
      type: Number,
      default: 0,
      min: [0, "Base price cannot be negative"],
    },
    color: {
      type: String,
      default: "#3498db",
    },
    icon: {
      type: String,
      default: "calendar",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Index for faster queries
eventTypeSchema.index({ name: 1, hotel: 1 }, { unique: true })
eventTypeSchema.index({ isActive: 1 })

const EventType = mongoose.model("EventType", eventTypeSchema)

module.exports = EventType
