import mongoose from "mongoose"

const eventBookingSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
      index: true,
    },
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventVenue",
      required: [true, "Venue ID is required"],
      index: true,
    },
    hotel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    customer: {
      name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Customer email is required"],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      company: {
        type: String,
        trim: true,
      },
      address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
      },
      customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Guest",
      },
    },
    start_date: {
      type: Date,
      required: [true, "Start date is required"],
    },
    end_date: {
      type: Date,
      required: [true, "End date is required"],
    },
    setup_start: {
      type: Date,
    },
    teardown_end: {
      type: Date,
    },
    attendees: {
      expected: {
        type: Number,
        default: 0,
      },
      actual: {
        type: Number,
      },
      min_guarantee: {
        type: Number,
      },
    },
    services: [
      {
        service_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventService",
        },
        name: String,
        description: String,
        quantity: {
          type: Number,
          default: 1,
        },
        unit_price: {
          type: Number,
          default: 0,
        },
        total_price: {
          type: Number,
          default: 0,
        },
        notes: String,
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled", "delivered"],
          default: "pending",
        },
      },
    ],
    packages: [
      {
        package_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventPackage",
        },
        name: String,
        description: String,
        price: {
          type: Number,
          default: 0,
        },
        services: [
          {
            service_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "EventService",
            },
            name: String,
            quantity: {
              type: Number,
              default: 1,
            },
          },
        ],
      },
    ],
    pricing: {
      venue_fee: {
        type: Number,
        default: 0,
      },
      services_total: {
        type: Number,
        default: 0,
      },
      packages_total: {
        type: Number,
        default: 0,
      },
      subtotal: {
        type: Number,
        default: 0,
      },
      tax_rate: {
        type: Number,
        default: 0,
      },
      tax_amount: {
        type: Number,
        default: 0,
      },
      service_charge_rate: {
        type: Number,
        default: 0,
      },
      service_charge_amount: {
        type: Number,
        default: 0,
      },
      discount_amount: {
        type: Number,
        default: 0,
      },
      discount_reason: String,
      total: {
        type: Number,
        default: 0,
      },
      deposit_required: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    payment: {
      status: {
        type: String,
        enum: ["pending", "partial", "paid", "refunded"],
        default: "pending",
      },
      deposit_paid: {
        type: Boolean,
        default: false,
      },
      deposit_date: Date,
      deposit_method: String,
      deposit_reference: String,
      amount_paid: {
        type: Number,
        default: 0,
      },
      balance_due: {
        type: Number,
        default: 0,
      },
      payment_due_date: Date,
      transactions: [
        {
          date: Date,
          amount: Number,
          method: String,
          reference: String,
          notes: String,
        },
      ],
    },
    contract: {
      status: {
        type: String,
        enum: ["pending", "sent", "signed", "cancelled"],
        default: "pending",
      },
      sent_date: Date,
      signed_date: Date,
      document_url: String,
      signed_by: String,
      terms_accepted: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ["inquiry", "tentative", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
      default: "inquiry",
    },
    notes: {
      internal: String,
      customer: String,
      special_requests: String,
    },
    timeline: [
      {
        status: String,
        date: Date,
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
      },
    ],
    attachments: [
      {
        name: String,
        file_url: String,
        uploaded_at: Date,
        uploaded_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    is_deleted: {
      type: Boolean,
      default: false,
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
  },
)

// Add indexes for common queries
eventBookingSchema.index({ hotel_id: 1, status: 1 })
eventBookingSchema.index({ venue_id: 1, start_date: 1, end_date: 1 })
eventBookingSchema.index({ "customer.email": 1 })
eventBookingSchema.index({ "customer.customer_id": 1 })
eventBookingSchema.index({ start_date: 1, end_date: 1 })

// Pre-save middleware to calculate pricing
eventBookingSchema.pre("save", function (next) {
  // Calculate services total
  let servicesTotal = 0
  if (this.services && this.services.length > 0) {
    this.services.forEach((service) => {
      service.total_price = service.unit_price * service.quantity
      servicesTotal += service.total_price
    })
  }
  this.pricing.services_total = servicesTotal

  // Calculate packages total
  let packagesTotal = 0
  if (this.packages && this.packages.length > 0) {
    this.packages.forEach((pkg) => {
      packagesTotal += pkg.price
    })
  }
  this.pricing.packages_total = packagesTotal

  // Calculate subtotal
  this.pricing.subtotal = this.pricing.venue_fee + this.pricing.services_total + this.pricing.packages_total

  // Calculate tax amount
  this.pricing.tax_amount = this.pricing.subtotal * (this.pricing.tax_rate / 100)

  // Calculate service charge amount
  this.pricing.service_charge_amount = this.pricing.subtotal * (this.pricing.service_charge_rate / 100)

  // Calculate total
  this.pricing.total =
    this.pricing.subtotal + this.pricing.tax_amount + this.pricing.service_charge_amount - this.pricing.discount_amount

  // Calculate balance due
  this.payment.balance_due = this.pricing.total - this.payment.amount_paid

  // Add status change to timeline if status has changed
  if (this.isModified("status")) {
    this.timeline.push({
      status: this.status,
      date: new Date(),
      user_id: this.updatedBy,
    })
  }

  next()
})

// Method to check if booking can be cancelled
eventBookingSchema.methods.canCancel = function () {
  const now = new Date()
  const startDate = new Date(this.start_date)
  const daysDifference = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24))

  // Check if booking is already in progress or completed
  if (["in_progress", "completed", "cancelled", "no_show"].includes(this.status)) {
    return {
      canCancel: false,
      reason: `Booking is already ${this.status}`,
    }
  }

  // Check cancellation policy (example: must cancel at least 3 days before)
  if (daysDifference < 3) {
    return {
      canCancel: true,
      penalty: true,
      penaltyAmount: this.pricing.total * 0.5, // 50% penalty for late cancellation
      reason: "Late cancellation fee applies",
    }
  }

  return {
    canCancel: true,
    penalty: false,
  }
}

const EventBooking = mongoose.model("EventBooking", eventBookingSchema)
export default EventBooking
