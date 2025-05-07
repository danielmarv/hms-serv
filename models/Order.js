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
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  servedAt: Date,
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountReason: String,
  isComplimentary: {
    type: Boolean,
    default: false,
  },
  complimentaryReason: String,
})

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["Cash", "Credit Card", "Debit Card", "Mobile Payment", "Room Charge", "Gift Card", "Voucher", "Other"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  cardType: String,
  cardLast4: String,
  transactionId: String,
  receiptNumber: String,
  paidAt: {
    type: Date,
    default: Date.now,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  notes: String,
})

const splitBillSchema = new mongoose.Schema({
  name: String,
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  items: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
      },
      quantity: Number,
      amount: Number,
    },
  ],
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Partially Paid"],
    default: "Pending",
  },
  payments: [paymentSchema],
})

const orderSchema = new mongoose.Schema(
  {
    // Order Identification
    orderNumber: {
      type: String,
      unique: true,
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

    // Staff
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Order Items
    items: [orderItemSchema],

    // Financial Details
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
    discountReason: String,
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
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    tip: {
      type: Number,
      default: 0,
      min: 0,
    },
    change: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payment Information
    payments: [paymentSchema],
    splitBills: [splitBillSchema],
    isSplitBill: {
      type: Boolean,
      default: false,
    },

    // Order Type and Status
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

    // Priority and Notes
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Rush", "VIP"],
      default: "Normal",
    },
    notes: String,
    kitchenNotes: String,
    allergyNotes: String,

    // Customer Information (for takeaway/delivery)
    customerName: String,
    customerPhone: String,
    deliveryAddress: String,
    deliveryNotes: String,

    // Timing
    orderedAt: {
      type: Date,
      default: Date.now,
    },
    estimatedReadyTime: Date,
    actualReadyTime: Date,
    servedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // Cancellation
    cancellationReason: String,

    // Modifications
    wasModified: {
      type: Boolean,
      default: false,
    },
    modificationNotes: String,
    modificationHistory: [
      {
        modifiedAt: Date,
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changes: String,
      },
    ],

    // Flags
    isVIP: {
      type: Boolean,
      default: false,
    },
    isRush: {
      type: Boolean,
      default: false,
    },

    // Audit Information
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

  // Calculate amount paid
  if (this.payments && this.payments.length > 0) {
    this.amountPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0)
  }

  // Update payment status
  if (this.amountPaid >= this.totalAmount) {
    this.paymentStatus = "Paid"
    this.change = this.amountPaid - this.totalAmount
  } else if (this.amountPaid > 0) {
    this.paymentStatus = "Partially Paid"
  }

  next()
})

// Update order status based on item statuses
orderSchema.pre("save", function (next) {
  if (this.isModified("items") || this.isNew) {
    const allItemStatuses = this.items.map((item) => item.status)

    if (allItemStatuses.every((status) => status === "Served")) {
      this.orderStatus = "Served"
      if (!this.servedAt) this.servedAt = new Date()
    } else if (allItemStatuses.every((status) => status === "Ready")) {
      this.orderStatus = "Ready"
      if (!this.actualReadyTime) this.actualReadyTime = new Date()
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

// Virtual for balance due
orderSchema.virtual("balanceDue").get(function () {
  return Math.max(0, this.totalAmount - this.amountPaid)
})

// Virtual for order age
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((new Date() - this.orderedAt) / (1000 * 60)) // in minutes
})

// Virtual for kitchen orders
orderSchema.virtual("kitchenOrders", {
  ref: "KitchenOrder",
  localField: "_id",
  foreignField: "order",
  justOne: false,
})

// Indexes for faster queries
orderSchema.index({ orderNumber: 1 }, { unique: true })
orderSchema.index({ hotel: 1 })
orderSchema.index({ restaurant: 1 })
orderSchema.index({ table: 1 })
orderSchema.index({ room: 1 })
orderSchema.index({ guest: 1 })
orderSchema.index({ booking: 1 })
orderSchema.index({ orderStatus: 1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ orderedAt: 1 })
orderSchema.index({ orderType: 1 })
orderSchema.index({ waiter: 1 })

const Order = mongoose.model("Order", orderSchema)
export default Order
