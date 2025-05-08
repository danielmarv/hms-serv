import mongoose from "mongoose"
import { ApiError } from "../utils/apiError.js"

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
            required: [true, "Discount amount is required"],
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
      amountPaid: {
        type: Number,
        default: 0,
        min: [0, "Amount paid cannot be negative"],
      },
      balance: {
        type: Number,
        min: [0, "Balance cannot be negative"],
      },
      transactions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment",
        },
      ],
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
            values: ["contract", "invoice", "receipt", "proposal", "other"],
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
      return next(new ApiError("Venue not found", 404))
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

// Calculate pricing
eventBookingSchema.pre("save", async function (next) {
  if (
    !this.isModified("services") &&
    !this.isModified("equipment") &&
    !this.isModified("catering") &&
    !this.isModified("startTime") &&
    !this.isModified("endTime") &&
    !this.isNew
  )
    return next()

  try {
    // Get venue for pricing
    const EventVenue = mongoose.model("EventVenue")
    const venue = await EventVenue.findById(this.venue)

    if (!venue) {
      return next(new ApiError("Venue not found", 404))
    }

    // Calculate venue price
    const startDate = new Date(this.startTime)
    const endDate = new Date(this.endTime)
    const durationHours = (endDate - startDate) / (1000 * 60 * 60)
    const venuePrice = venue.basePrice + venue.pricePerHour * durationHours

    // Calculate services cost
    let servicesCost = 0
    if (this.services && this.services.length > 0) {
      servicesCost = this.services.reduce((total, service) => total + service.price * service.quantity, 0)
    }

    // Calculate equipment cost
    let equipmentCost = 0
    if (this.equipment && this.equipment.length > 0) {
      equipmentCost = this.equipment.reduce((total, equipment) => total + equipment.price * equipment.quantity, 0)
    }

    // Calculate catering cost (placeholder - would be calculated based on menu and headcount)
    let cateringCost = 0
    if (this.catering && this.catering.isRequired && this.catering.menuId) {
      // This would typically involve a more complex calculation based on the menu and headcount
      // For now, we'll use a placeholder calculation
      cateringCost = this.catering.headCount ? this.catering.headCount * 25 : 0
    }

    // Calculate additional costs
    let additionalCostsTotal = 0
    if (this.pricing && this.pricing.additionalCosts && this.pricing.additionalCosts.length > 0) {
      additionalCostsTotal = this.pricing.additionalCosts.reduce((total, cost) => total + cost.amount, 0)
    }

    // Calculate discounts
    let discountsTotal = 0
    if (this.pricing && this.pricing.discounts && this.pricing.discounts.length > 0) {
      discountsTotal = this.pricing.discounts.reduce((total, discount) => {
        if (discount.percentage) {
          const subtotal = venuePrice + servicesCost + equipmentCost + cateringCost + additionalCostsTotal
          return total + subtotal * (discount.percentage / 100)
        } else {
          return total + discount.amount
        }
      }, 0)
    }

    // Calculate totals
    const totalBeforeTax =
      venuePrice + servicesCost + equipmentCost + cateringCost + additionalCostsTotal - discountsTotal

    // Get tax rate from hotel configuration or use default
    let taxRate = 0.1 // Default 10%
    if (this.hotel) {
      const Hotel = mongoose.model("Hotel")
      const hotel = await Hotel.findById(this.hotel)
      if (hotel && hotel.configuration && hotel.configuration.taxRate) {
        taxRate = hotel.configuration.taxRate / 100
      }
    }

    const taxAmount = totalBeforeTax * taxRate
    const grandTotal = totalBeforeTax + taxAmount

    // Update pricing object
    this.pricing = {
      ...this.pricing,
      venuePrice,
      servicesCost,
      equipmentCost,
      cateringCost,
      taxRate,
      taxAmount,
      totalBeforeTax,
      grandTotal,
    }

    // Calculate deposit amount if required
    if (this.payment && this.payment.depositRequired) {
      this.payment.depositAmount = grandTotal * 0.3 // Default 30% deposit
      this.payment.balance = grandTotal - (this.payment.amountPaid || 0)
    }

    next()
  } catch (error) {
    next(error)
  }
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
