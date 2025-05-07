import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema({
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
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
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
  preparedBy: {
    type: String,
  },
  servedAt: Date,
})

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Remove index: true if it exists
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceChargePercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceChargeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderType: {
      type: String,
      enum: ["Dine In", "Room Service", "Takeaway", "Delivery"],
      default: "Dine In",
    },
    orderStatus: {
      type: String,
      enum: ["New", "In Progress", "Ready", "Served", "Completed", "Cancelled"],
      default: "New",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid", "Complimentary", "Charged to Room"],
      default: "Pending",
    },
    notes: String,
    customerName: String,
    customerPhone: String,
    deliveryAddress: String,
    deliveryNotes: String,
    priority: {
      type: String,
      enum: ["Normal", "High", "Rush"],
      default: "Normal",
    },
    estimatedReadyTime: Date,
    actualReadyTime: Date,
    orderedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    wasModified: {
      type: Boolean,
      default: false,
    },
    modificationNotes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
)

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const today = new Date()
    const year = today.getFullYear().toString().slice(-2)
    const month = (today.getMonth() + 1).toString().padStart(2, "0")
    const day = today.getDate().toString().padStart(2, "0")

    // Find the highest order number for today
    const latestOrder = await this.constructor
      .findOne({
        orderNumber: new RegExp(`^ORD-${year}${month}${day}-`),
      })
      .sort({ orderNumber: -1 })

    let sequence = 1
    if (latestOrder) {
      const latestSequence = Number.parseInt(latestOrder.orderNumber.split("-")[2])
      sequence = latestSequence + 1
    }

    this.orderNumber = `ORD-${year}${month}${day}-${sequence.toString().padStart(3, "0")}`
  }
  next()
})

// Calculate totals before saving
orderSchema.pre("save", function (next) {
  // Calculate item totals
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      let modifiersTotal = 0
      if (item.modifiers && item.modifiers.length > 0) {
        modifiersTotal = item.modifiers.reduce((sum, modifier) => sum + (modifier.price || 0), 0)
      }
      item.totalPrice = (item.unitPrice + modifiersTotal) * item.quantity
    })
  }

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0)

  // Calculate tax amount
  this.taxAmount = this.subtotal * (this.taxRate / 100)

  // Calculate discount amount
  this.discountAmount = this.subtotal * (this.discountPercentage / 100)

  // Calculate service charge
  this.serviceChargeAmount = this.subtotal * (this.serviceChargePercentage / 100)

  // Calculate total
  this.totalAmount = this.subtotal + this.taxAmount + this.serviceChargeAmount - this.discountAmount

  next()
})

// Update order status based on item statuses
orderSchema.pre("save", function (next) {
  if (this.isModified("items") || this.isNew) {
    const allItemStatuses = this.items.map((item) => item.status)

    if (allItemStatuses.every((status) => status === "Served")) {
      this.orderStatus = "Served"
    } else if (allItemStatuses.every((status) => status === "Ready")) {
      this.orderStatus = "Ready"
    } else if (allItemStatuses.some((status) => status === "In Progress" || status === "Ready")) {
      this.orderStatus = "In Progress"
    }
  }

  // Set completion time if status changed to Completed
  if (this.isModified("orderStatus") && this.orderStatus === "Completed" && !this.completedAt) {
    this.completedAt = new Date()
  }

  // Set cancellation time if status changed to Cancelled
  if (this.isModified("orderStatus") && this.orderStatus === "Cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date()
  }

  next()
})

// Indexes for faster queries - KEEP ONLY THESE, REMOVE ANY index: true FROM FIELDS ABOVE
orderSchema.index({ orderNumber: 1 }, { unique: true })
orderSchema.index({ table: 1 })
orderSchema.index({ room: 1 })
orderSchema.index({ guest: 1 })
orderSchema.index({ booking: 1 })
orderSchema.index({ orderStatus: 1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ orderedAt: 1 })
orderSchema.index({ orderType: 1 })

const Order = mongoose.model("Order", orderSchema)
export default Order
