import mongoose from "mongoose"

const kitchenItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  notes: String,
  modifiers: [
    {
      name: String,
    },
  ],
  status: {
    type: String,
    enum: ["Pending", "Cooking", "Ready", "Served", "Cancelled"],
    default: "Pending",
  },
  startedAt: Date,
  completedAt: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
})

const kitchenOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    items: [kitchenItemSchema],
    priority: {
      type: String,
      enum: ["Normal", "High", "Rush"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Ready", "Completed", "Cancelled"],
      default: "Pending",
    },
    notes: String,
    orderType: {
      type: String,
      enum: ["Dine In", "Room Service", "Takeaway", "Delivery"],
      default: "Dine In",
    },
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    estimatedCompletionTime: Date,
    actualCompletionTime: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    isModified: {
      type: Boolean,
      default: false,
    },
    modificationNotes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
)

// Update kitchen order status based on item statuses
kitchenOrderSchema.pre("save", function (next) {
  if (this.isModified("items") || this.isNew) {
    const allItemStatuses = this.items.map((item) => item.status)

    if (allItemStatuses.every((status) => status === "Served" || status === "Cancelled")) {
      this.status = "Completed"
      this.completedAt = new Date()
    } else if (allItemStatuses.every((status) => status === "Ready" || status === "Served" || status === "Cancelled")) {
      this.status = "Ready"
    } else if (allItemStatuses.some((status) => status === "Cooking" || status === "Ready")) {
      this.status = "In Progress"
      if (!this.startedAt) {
        this.startedAt = new Date()
      }
    }
  }

  // Set cancellation time if status changed to Cancelled
  if (this.isModified("status") && this.status === "Cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date()
  }

  next()
})

// Indexes for faster queries
kitchenOrderSchema.index({ order: 1 })
kitchenOrderSchema.index({ orderNumber: 1 })
kitchenOrderSchema.index({ table: 1 })
kitchenOrderSchema.index({ room: 1 })
kitchenOrderSchema.index({ status: 1 })
kitchenOrderSchema.index({ priority: 1 })
kitchenOrderSchema.index({ createdAt: 1 })

const KitchenOrder = mongoose.model("KitchenOrder", kitchenOrderSchema)
export default KitchenOrder
