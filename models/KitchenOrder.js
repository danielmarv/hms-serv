import mongoose from "mongoose"

const kitchenOrderItemSchema = new mongoose.Schema({
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
      price: Number,
    },
  ],
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Ready", "Served", "Cancelled"],
    default: "Pending",
  },
  startedAt: Date,
  completedAt: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  estimatedCompletionTime: Date,
})

const kitchenOrderSchema = new mongoose.Schema(
  {
    // Order Information
    orderNumber: {
      type: String,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Associations
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },

    // Location
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },

    // Items
    items: [kitchenOrderItemSchema],

    // Status
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Partially Ready", "Ready", "Served", "Completed", "Cancelled"],
      default: "Pending",
    },

    // Priority and Type
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Rush", "VIP"],
      default: "Normal",
    },
    orderType: {
      type: String,
      enum: ["Dine In", "Room Service", "Takeaway", "Delivery"],
      default: "Dine In",
    },

    // Staff
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Timing
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    readyAt: Date,
    servedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // Estimated Times
    estimatedPrepTime: Number, // in minutes
    estimatedReadyTime: Date,

    // Notes
    notes: String,
    kitchenNotes: String,
    allergyNotes: String,

    // Flags
    isModified: {
      type: Boolean,
      default: false,
    },
    isRush: {
      type: Boolean,
      default: false,
    },
    isVIP: {
      type: Boolean,
      default: false,
    },

    // Cancellation
    cancellationReason: String,

    // Audit Information
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

// Calculate overall status based on item statuses
kitchenOrderSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    const statuses = this.items.map((item) => item.status)

    if (statuses.every((status) => status === "Cancelled")) {
      this.status = "Cancelled"
    } else if (statuses.every((status) => status === "Served" || status === "Cancelled")) {
      this.status = "Served"
    } else if (statuses.every((status) => status === "Ready" || status === "Served" || status === "Cancelled")) {
      this.status = "Ready"
    } else if (statuses.some((status) => status === "Ready" || status === "Served")) {
      this.status = "Partially Ready"
    } else if (statuses.some((status) => status === "In Progress")) {
      this.status = "In Progress"
    }
  }

  // Set timestamps based on status changes
  if (this.isModified("status")) {
    const now = new Date()

    if (this.status === "In Progress" && !this.startedAt) {
      this.startedAt = now
    } else if (this.status === "Ready" && !this.readyAt) {
      this.readyAt = now
    } else if (this.status === "Served" && !this.servedAt) {
      this.servedAt = now
    } else if (this.status === "Completed" && !this.completedAt) {
      this.completedAt = now
    } else if (this.status === "Cancelled" && !this.cancelledAt) {
      this.cancelledAt = now
    }
  }

  next()
})

// Calculate estimated ready time
kitchenOrderSchema.pre("save", function (next) {
  if (this.isModified("items") || this.isNew) {
    // Find the item with the longest preparation time
    let maxPrepTime = 0

    this.items.forEach(async (item) => {
      try {
        const menuItem = await mongoose.model("MenuItem").findById(item.menuItem)
        if (menuItem && menuItem.preparationTime > maxPrepTime) {
          maxPrepTime = menuItem.preparationTime
        }
      } catch (error) {
        // Continue even if we can't find the menu item
      }
    })

    // Set estimated prep time
    this.estimatedPrepTime = maxPrepTime

    // Calculate estimated ready time
    if (this.receivedAt && maxPrepTime > 0) {
      const readyTime = new Date(this.receivedAt)
      readyTime.setMinutes(readyTime.getMinutes() + maxPrepTime)
      this.estimatedReadyTime = readyTime
    }
  }

  next()
})

// Virtual for preparation progress
kitchenOrderSchema.virtual("preparationProgress").get(function () {
  if (!this.items || this.items.length === 0) return 0

  const completedItems = this.items.filter((item) => ["Ready", "Served"].includes(item.status)).length

  return (completedItems / this.items.length) * 100
})

// Virtual for time elapsed since order received
kitchenOrderSchema.virtual("timeElapsed").get(function () {
  if (!this.receivedAt) return 0
  return Math.floor((new Date() - this.receivedAt) / (1000 * 60)) // in minutes
})

// Virtual for time remaining until estimated completion
kitchenOrderSchema.virtual("timeRemaining").get(function () {
  if (!this.estimatedReadyTime) return null
  const remaining = Math.floor((this.estimatedReadyTime - new Date()) / (1000 * 60))
  return remaining > 0 ? remaining : 0
})

// Indexes for faster queries
kitchenOrderSchema.index({ orderNumber: 1 })
kitchenOrderSchema.index({ order: 1 })
kitchenOrderSchema.index({ hotel: 1 })
kitchenOrderSchema.index({ restaurant: 1 })
kitchenOrderSchema.index({ table: 1 })
kitchenOrderSchema.index({ room: 1 })
kitchenOrderSchema.index({ status: 1 })
kitchenOrderSchema.index({ priority: 1 })
kitchenOrderSchema.index({ receivedAt: 1 })
kitchenOrderSchema.index({ estimatedReadyTime: 1 })
kitchenOrderSchema.index({ waiter: 1 })
kitchenOrderSchema.index({ chef: 1 })

const KitchenOrder = mongoose.model("KitchenOrder", kitchenOrderSchema)
export default KitchenOrder
