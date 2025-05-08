import mongoose from "mongoose"

const eventBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
      required: [true, "Venue ID is required"],
    },
    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type ID is required"],
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventPackage",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: [true, "Customer ID is required"],
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [100, "Event title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    setupStartTime: {
      type: Date,
      required: [true, "Setup start time is required"],
    },
    cleanupEndTime: {
      type: Date,
      required: [true, "Cleanup end time is required"],
    },
    attendees: {
      expected: {
        type: Number,
        required: [true, "Expected number of attendees is required"],
        min: [1, "Expected attendees must be at least 1"],
      },
      actual: {
        type: Number,
        min: [0, "Actual attendees cannot be negative"],
      },
      details: {
        type: String,
        trim: true,
      },
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventService",
          required: [true, "Service ID is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        specialRequests: {
          type: String,
          trim: true,
        },
        price: {
          type: Number,
          required: [true, "Price is required"],
          min: [0, "Price cannot be negative"],
        },
        status: {
          type: String,
          enum: {
            values: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
            message: "Invalid service status",
          },
          default: "pending",
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    venueSetup: {
      layout: {
        type: String,
        enum: {
          values: ["theater", "classroom", "boardroom", "u_shape", "banquet", "reception", "custom"],
          message: "Invalid layout type",
        },
        default: "theater",
      },
      customLayoutDetails: {
        type: String,
        trim: true,
      },
      specialRequests: {
        type: String,
        trim: true,
      },
      setupInstructions: {
        type: String,
        trim: true,
      },
      setupConfirmed: {
        type: Boolean,
        default: false,
      },
      setupCompletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      setupCompletedAt: {
        type: Date,
      },
    },
    catering: {
      isRequired: {
        type: Boolean,
        default: false,
      },
      menuId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
      },
      mealType: {
        type: String,
        enum: {
          values: ["breakfast", "lunch", "dinner", "cocktail", "buffet", "custom"],
          message: "Invalid meal type",
        },
      },
      headCount: {
        type: Number,
        min: [0, "Head count cannot be negative"],
      },
      dietaryRestrictions: [
        {
          type: String,
          trim: true,
        },
      ],
      specialRequests: {
        type: String,
        trim: true,
      },
      servingTime: {
        type: Date,
      },
      status: {
        type: String,
        enum: {
          values: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
          message: "Invalid catering status",
        },
        default: "pending",
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    equipment: [
      {
        name: {
          type: String,
          required: [true, "Equipment name is required"],
          trim: true,
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: [true, "Price is required"],
          min: [0, "Price cannot be negative"],
        },
        setupInstructions: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: {
            values: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
            message: "Invalid equipment status",
          },
          default: "pending",
        },
      },
    ],
    staffAssignments: [
      {
        staff: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: [true, "Staff ID is required"],
        },
        role: {
          type: String,
          required: [true, "Staff role is required"],
          trim: true,
        },
        startTime: {
          type: Date,
          required: [true, "Staff start time is required"],
        },
        endTime: {
          type: Date,
          required: [true, "Staff end time is required"],
        },
        notes: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: {
            values: ["assigned", "confirmed", "checked_in", "completed", "no_show"],
            message: "Invalid staff status",
          },
          default: "assigned",
        },
        checkedInAt: {
          type: Date,
        },
        checkedOutAt: {
          type: Date,
        },
      },
    ],
    pricing: {
      venuePrice: {
        type: Number,
        required: [true, "Venue price is required"],
        min: [0, "Venue price cannot be negative"],
      },
      servicesCost: {
        type: Number,
        required: [true, "Services cost is required"],
        min: [0, "Services cost cannot be negative"],
      },
      equipmentCost: {
        type: Number,
        required: [true, "Equipment cost is required"],
        min: [0, "Equipment cost cannot be negative"],
      },
      cateringCost: {
        type: Number,
        required: [true, "Catering cost is required"],
        min: [0, "Catering cost cannot be negative"],
      },
      staffingCost: {
        type: Number,
        default: 0,
        min: [0, "Staffing cost cannot be negative"],
      },
      additionalCosts: [
        {
          description: {
            type: String,
            required: [true, "Cost description is required"],
            trim: true,
          },
          amount: {
            type: Number,
            required: [true, "Cost amount is required"],
            min: [0, "Cost amount cannot be negative"],
          },
        },
      ],
      discounts: [
        {
          description: {
            type: String,
            required: [true, "Discount description is required"],
            trim: true,
          },
          amount: {
            type: Number,
            min: [0, "Discount amount cannot be negative"],
          },
          percentage: {
            type: Number,
            min: [0, "Discount percentage cannot be negative"],
            max: [100, "Discount percentage cannot exceed 100"],
          },
        },
      ],
      taxRate: {
        type: Number,
        required: [true, "Tax rate is required"],
        min: [0, "Tax rate cannot be negative"],
      },
      taxAmount: {
        type: Number,
        required: [true, "Tax amount is required"],
        min: [0, "Tax amount cannot be negative"],
      },
      totalBeforeTax: {
        type: Number,
        required: [true, "Total before tax is required"],
        min: [0, "Total before tax cannot be negative"],
      },
      grandTotal: {
        type: Number,
        required: [true, "Grand total is required"],
        min: [0, "Grand total cannot be negative"],
      },
    },
    payment: {
      status: {
        type: String,
        enum: {
          values: ["pending", "partial", "paid", "refunded", "cancelled"],
          message: "Invalid payment status",
        },
        default: "pending",
      },
      depositRequired: {
        type: Boolean,
        default: true,
      },
      depositAmount: {
        type: Number,
        min: [0, "Deposit amount cannot be negative"],
      },
      depositPaid: {
        type: Boolean,
        default: false,
      },
      depositPaidDate: {
        type: Date,
      },
      depositPaymentMethod: {
        type: String,
        enum: {
          values: ["cash", "credit_card", "bank_transfer", "check", "other"],
          message: "Invalid payment method",
        },
      },
      amountPaid: {
        type: Number,
        default: 0,
        min: [0, "Amount paid cannot be negative"],
      },
      balance: {
        type: Number,
        min: [0, "Balance cannot be negative"],
      },
      dueDate: {
        type: Date,
      },
      transactions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment",
        },
      ],
      billingAddress: {
        addressLine1: {
          type: String,
          trim: true,
        },
        addressLine2: {
          type: String,
          trim: true,
        },
        city: {
          type: String,
          trim: true,
        },
        state: {
          type: String,
          trim: true,
        },
        postalCode: {
          type: String,
          trim: true,
        },
        country: {
          type: String,
          trim: true,
        },
      },
      billingContact: {
        name: {
          type: String,
          trim: true,
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        phone: {
          type: String,
          trim: true,
        },
      },
    },
    status: {
      type: String,
      enum: {
        values: ["inquiry", "tentative", "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
        message: "Invalid booking status",
      },
      default: "inquiry",
    },
    cancellation: {
      isCancelled: {
        type: Boolean,
        default: false,
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      cancellationDate: {
        type: Date,
      },
      cancellationReason: {
        type: String,
        trim: true,
      },
      refundAmount: {
        type: Number,
        min: [0, "Refund amount cannot be negative"],
      },
      cancellationFee: {
        type: Number,
        min: [0, "Cancellation fee cannot be negative"],
      },
      cancellationPolicy: {
        type: String,
        trim: true,
      },
    },
    documents: [
      {
        name: {
          type: String,
          required: [true, "Document name is required"],
          trim: true,
        },
        url: {
          type: String,
          required: [true, "Document URL is required"],
        },
        type: {
          type: String,
          enum: {
            values: ["contract", "invoice", "receipt", "proposal", "beo", "other"],
            message: "Invalid document type",
          },
          default: "other",
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        isCustomerVisible: {
          type: Boolean,
          default: false,
        },
      },
    ],
    notes: [
      {
        content: {
          type: String,
          required: [true, "Note content is required"],
          trim: true,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: [true, "User ID is required"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isInternal: {
          type: Boolean,
          default: true,
        },
      },
    ],
    timeline: [
      {
        action: {
          type: String,
          required: [true, "Action is required"],
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        details: {
          type: String,
          trim: true,
        },
      },
    ],
    checklist: [
      {
        task: {
          type: String,
          required: [true, "Task is required"],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        dueDate: {
          type: Date,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        completedAt: {
          type: Date,
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        priority: {
          type: String,
          enum: {
            values: ["low", "medium", "high", "critical"],
            message: "Invalid priority level",
          },
          default: "medium",
        },
      },
    ],
    feedback: {
      rating: {
        type: Number,
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      comments: {
        type: String,
        trim: true,
      },
      submittedAt: {
        type: Date,
      },
      areas: {
        venue: {
          rating: {
            type: Number,
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
          },
          comments: {
            type: String,
            trim: true,
          },
        },
        catering: {
          rating: {
            type: Number,
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
          },
          comments: {
            type: String,
            trim: true,
          },
        },
        staff: {
          rating: {
            type: Number,
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
          },
          comments: {
            type: String,
            trim: true,
          },
        },
        overall: {
          rating: {
            type: Number,
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
          },
          comments: {
            type: String,
            trim: true,
          },
        },
      },
      followUpRequired: {
        type: Boolean,
        default: false,
      },
      followUpNotes: {
        type: String,
        trim: true,
      },
      followUpCompletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      followUpCompletedAt: {
        type: Date,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Generate booking number
eventBookingSchema.pre("save", async function (next) {
  if (!this.isNew) return next()

  try {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, "0")

    // Find the latest booking number for this month
    const latestBooking = await this.constructor.findOne(
      {
        bookingNumber: { $regex: `^EVT-${year}${month}` },
        hotel: this.hotel,
      },
      { bookingNumber: 1 },
      { sort: { bookingNumber: -1 } },
    )

    let sequenceNumber = 1
    if (latestBooking) {
      const latestSequence = Number.parseInt(latestBooking.bookingNumber.split("-")[2])
      sequenceNumber = latestSequence + 1
    }

    this.bookingNumber = `EVT-${year}${month}-${sequenceNumber.toString().padStart(4, "0")}`
    next()
  } catch (error) {
    next(error)
  }
})

// Calculate setup and cleanup times
eventBookingSchema.pre("save", async function (next) {
  if (!this.isModified("startTime") && !this.isModified("endTime") && !this.isNew) return next()

  try {
    // Get venue for setup and cleanup times
    const EventVenue = mongoose.model("EventVenue")
    const venue = await EventVenue.findById(this.venue)

    if (!venue) {
      return next(new Error("Venue not found"))
    }

    // Calculate setup start time (start time - setup time)
    const setupMinutes = venue.setupTime || 60
    const setupStartTime = new Date(this.startTime)
    setupStartTime.setMinutes(setupStartTime.getMinutes() - setupMinutes)
    this.setupStartTime = setupStartTime

    // Calculate cleanup end time (end time + cleanup time)
    const cleanupMinutes = venue.cleanupTime || 60
    const cleanupEndTime = new Date(this.endTime)
    cleanupEndTime.setMinutes(cleanupEndTime.getMinutes() + cleanupMinutes)
    this.cleanupEndTime = cleanupEndTime

    next()
  } catch (error) {
    next(error)
  }
})

// Add to timeline
eventBookingSchema.pre("save", function (next) {
  if (this.isNew) {
    this.timeline = [
      {
        action: "Booking created",
        timestamp: new Date(),
        user: this.createdBy,
        details: `Booking ${this.bookingNumber} created for ${this.title}`,
      },
    ]
  } else if (this.isModified("status")) {
    this.timeline.push({
      action: `Status changed to ${this.status}`,
      timestamp: new Date(),
      user: this.updatedBy,
      details: `Booking status updated from ${this._oldStatus || "unknown"} to ${this.status}`,
    })
  }

  // Store current status for future reference
  this._oldStatus = this.status

  next()
})

// Index for efficient queries
eventBookingSchema.index({ hotel: 1, venue: 1, startTime: 1, endTime: 1 })
eventBookingSchema.index({ hotel: 1, customer: 1 })
eventBookingSchema.index({ bookingNumber: 1 })
eventBookingSchema.index({ status: 1 })
eventBookingSchema.index({ "payment.status": 1 })
eventBookingSchema.index({ isDeleted: 1 })

const EventBooking = mongoose.model("EventBooking", eventBookingSchema)

export default EventBooking
