import mongoose from "mongoose"

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
      // Removed index: true since we're using schema.index() below
    },
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: [true, "Room type is required"],
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
    },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "cleaning", "reserved"],
      default: "available",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    amenities: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
    },
    lastCleaned: {
      type: Date,
    },
    maintenanceHistory: [
      {
        issue: {
          type: String,
          required: true,
        },
        reportedDate: {
          type: Date,
          default: Date.now,
        },
        resolvedDate: {
          type: Date,
        },
        cost: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for current booking
roomSchema.virtual("currentBooking", {
  ref: "Booking",
  localField: "_id",
  foreignField: "room",
  justOne: true,
  match: {
    status: { $in: ["confirmed", "checked-in"] },
    checkInDate: { $lte: new Date() },
    checkOutDate: { $gt: new Date() },
  },
})

// Indexes for faster queries
roomSchema.index({ roomNumber: 1 })
roomSchema.index({ roomType: 1 })
roomSchema.index({ status: 1 })
roomSchema.index({ floor: 1 })

const Room = mongoose.model("Room", roomSchema)

export default Room
