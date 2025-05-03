import mongoose from "mongoose"

const dataSyncLogSchema = new mongoose.Schema(
  {
    chainCode: {
      type: String,
      required: true,
      index: true,
    },
    syncType: {
      type: String,
      enum: ["configuration", "rates", "inventory", "users", "roles", "full"],
      required: true,
    },
    sourceHotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
    },
    targetHotels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "failed"],
      default: "pending",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    details: {
      success: Number,
      failed: Number,
      skipped: Number,
    },
    errors: [
      {
        hotelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hotel",
        },
        error: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Create and export the model
const DataSyncLog = mongoose.model("DataSyncLog", dataSyncLogSchema)
export default DataSyncLog
