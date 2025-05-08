import mongoose from "mongoose"

const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event type name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    hotel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    category: {
      type: String,
      enum: ["business", "social", "celebration", "educational", "other"],
      default: "other",
    },
    color: {
      type: String,
      default: "#3788d8", // Default blue color
    },
    icon: {
      type: String,
      default: "calendar",
    },
    default_duration: {
      type: Number, // Duration in minutes
      default: 60,
    },
    default_capacity: {
      type: Number,
      default: 0,
    },
    base_price: {
      type: Number,
      default: 0,
    },
    price_per_person: {
      type: Number,
      default: 0,
    },
    features: [String],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    is_deleted: {
      type: Boolean,
      default: false,
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

// Add indexes for common queries
eventTypeSchema.index({ hotel_id: 1, status: 1 })
eventTypeSchema.index({ name: 1, hotel_id: 1 }, { unique: true })

const EventType = mongoose.model("EventType", eventTypeSchema)
export default EventType
