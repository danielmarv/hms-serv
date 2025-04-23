import mongoose from "mongoose"

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room type name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    capacity: {
      adults: {
        type: Number,
        required: [true, "Adult capacity is required"],
        min: [1, "Adult capacity must be at least 1"],
      },
      children: {
        type: Number,
        default: 0,
      },
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    amenities: [
      {
        type: String,
      },
    ],
    images: [
      {
        type: String,
      },
    ],
    size: {
      type: Number, // in square feet/meters
      required: [true, "Room size is required"],
    },
    bedConfiguration: {
      type: String,
      required: [true, "Bed configuration is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxOccupancy: {
      type: Number,
      required: [true, "Maximum occupancy is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for rooms of this type
roomTypeSchema.virtual("rooms", {
  ref: "Room",
  localField: "_id",
  foreignField: "roomType",
})

// Virtual for available rooms count
roomTypeSchema.virtual("availableRoomsCount").get(function () {
  if (!this.rooms) return 0
  return this.rooms.filter((room) => room.status === "available").length
})

// Indexes for faster queries
roomTypeSchema.index({ name: 1 })
roomTypeSchema.index({ basePrice: 1 })
roomTypeSchema.index({ isActive: 1 })

const RoomType = mongoose.model("RoomType", roomTypeSchema)

export default RoomType
