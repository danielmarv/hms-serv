import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    check_in: { type: Date, required: true },
    check_out: { type: Date, required: true },

    number_of_guests: { type: Number, required: true, min: 1 },
    booking_source: {
      type: String,
      enum: ["direct", "website", "phone", "email", "walk_in", "agent", "ota", "other"],
      default: "direct",
    },
    payment_status: { type: String, enum: ["pending", "partial", "paid", "refunded"], default: "pending" },
    payment_method: {
      type: String,
      enum: ["cash", "credit_card", "debit_card", "bank_transfer", "mobile_money", "online", "other"],
    },
    total_amount: { type: Number, required: true, min: 0 },
    special_requests: String,
    status: {
      type: String,
      enum: ["confirmed", "checked_in", "checked_out", "cancelled", "no_show"],
      default: "confirmed",
    },
    cancellation_reason: String,
    cancellation_date: Date,
    was_modified: { type: Boolean, default: false }, // Changed from is_modified
    modification_notes: String,
    confirmation_number: {
      type: String,
      unique: true,
      // Removed index: true since we're using schema.index() below
    },
    rate_plan: { type: mongoose.Schema.Types.ObjectId, ref: "CustomPrice" },
    additional_charges: [
      {
        description: String,
        amount: Number,
        date: { type: Date, default: Date.now },
      },
    ],
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount_reason: String,
    tax_amount: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 0 },
    is_group_booking: { type: Boolean, default: false },
    group_id: { type: String },
    is_corporate: { type: Boolean, default: false },
    corporate_id: { type: mongoose.Schema.Types.ObjectId, ref: "Corporate" },
    assigned_staff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    check_in_time: Date,
    check_out_time: Date,
    actual_check_in: Date,
    actual_check_out: Date,
    no_show_charged: { type: Boolean, default: false },
    early_check_in: { type: Boolean, default: false },
    late_check_out: { type: Boolean, default: false },
    early_check_in_fee: { type: Number, default: 0 },
    late_check_out_fee: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

// Indexes for faster queries
bookingSchema.index({ guest: 1 })
bookingSchema.index({ room: 1 })
bookingSchema.index({ check_in: 1, check_out: 1 })
bookingSchema.index({ status: 1 })
bookingSchema.index({ confirmation_number: 1 }, { unique: true })

// Generate confirmation number before saving
bookingSchema.pre("save", async function (next) {
  if (!this.confirmation_number) {
    const timestamp = new Date().getTime().toString().slice(-6)
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    this.confirmation_number = `BK-${timestamp}${random}`
  }
  next()
})

// Validate check-in and check-out dates
bookingSchema.path("check_in").validate(function (value) {
  return value < this.check_out
}, "Check-in date must be before check-out date")

// Calculate booking duration in days
bookingSchema.virtual("duration").get(function () {
  const checkIn = new Date(this.check_in)
  const checkOut = new Date(this.check_out)
  const diffTime = Math.abs(checkOut - checkIn)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Calculate total with taxes and additional charges
bookingSchema.virtual("grand_total").get(function () {
  let total = this.total_amount

  // Add additional charges
  if (this.additional_charges && this.additional_charges.length > 0) {
    total += this.additional_charges.reduce((sum, charge) => sum + charge.amount, 0)
  }

  // Add early check-in and late check-out fees
  total += this.early_check_in_fee + this.late_check_out_fee

  // Apply discount
  if (this.discount) {
    total -= this.discount
  }

  // Add tax
  total += this.tax_amount

  return total
})

const Booking = mongoose.model("Booking", bookingSchema)
export default Booking
