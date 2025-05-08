const mongoose = require("mongoose")

const eventBookingSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
      required: [true, "Venue is required"],
    },
    eventType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: [true, "Event type is required"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    attendees: {
      type: Number,
      required: [true, "Number of attendees is required"],
      min: [1, "Attendees must be at least 1"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    services: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventService",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
        specialRequests: {
          type: String,
          trim: true,
          maxlength: [500, "Special requests cannot exceed 500 characters"],
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    deposit: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Deposit amount cannot be negative"],
      },
      paid: {
        type: Boolean,
        default: false,
      },
      paidAt: {
        type: Date,
      },
      paymentMethod: {
        type: String,
        enum: ["cash", "credit_card", "bank_transfer", "check", "other"],
      },
      paymentReference: {
        type: String,
        trim: true,
      },
    },
    balance: {
      amount: {
        type: Number,
        default: 0,
        min: [0, "Balance amount cannot be negative"],
      },
      paid: {
        type: Boolean,
        default: false,
      },
      paidAt: {
        type: Date,
      },
      paymentMethod: {
        type: String,
        enum: ["cash", "credit_card", "bank_transfer", "check", "other"],
      },
      paymentReference: {
        type: String,
        trim: true,
      },
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [1000, "Special requests cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel is required"],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Calculate duration in hours
eventBookingSchema.virtual("durationHours").get(function () {
  return (this.endTime - this.startTime) / (1000 * 60 * 60)
})

// Check if event is happening now
eventBookingSchema.virtual("isHappeningNow").get(function () {
  const now = new Date()
  return now >= this.startTime && now <= this.endTime
})

// Pre-save middleware to calculate total amount
eventBookingSchema.pre("save", function (next) {
  // Calculate services total
  const servicesTotal = this.services.reduce((total, service) => {
    return total + service.price * service.quantity
  }, 0)

  // Set total amount
  this.totalAmount = this.basePrice + servicesTotal

  next()
})

// Index for faster queries
eventBookingSchema.index({ venue: 1, startTime: 1, endTime: 1 })
eventBookingSchema.index({ customer: 1 })
eventBookingSchema.index({ status: 1 })
eventBookingSchema.index({ hotel: 1 })
eventBookingSchema.index({ startTime: 1, endTime: 1 })

const EventBooking = mongoose.model("EventBooking", eventBookingSchema)

module.exports = EventBooking
