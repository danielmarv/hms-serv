import mongoose from "mongoose"

const maintenanceSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
    },
    issueType: {
      type: String,
      required: [true, "Issue type is required"],
      enum: ["plumbing", "electrical", "furniture", "appliance", "structural", "cleaning", "other"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: ["pending", "in-progress", "resolved", "cancelled"],
      default: "pending",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter is required"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    scheduledDate: {
      type: Date,
    },
    resolvedDate: {
      type: Date,
    },
    resolution: {
      type: String,
    },
    cost: {
      type: Number,
      default: 0,
    },
    images: [
      {
        type: String,
      },
    ],
    notes: [
      {
        text: {
          type: String,
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
maintenanceSchema.index({ room: 1, status: 1 })
maintenanceSchema.index({ reportedDate: 1 })
maintenanceSchema.index({ status: 1 })

const Maintenance = mongoose.model("Maintenance", maintenanceSchema)

export default Maintenance
