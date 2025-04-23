import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    paymentNumber: {
      type: String,
      unique: true,
      // Removed index: true since we're using schema.index() below
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["Cash", "Credit Card", "Debit Card", "Mobile Money", "Bank Transfer", "Online", "Voucher", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded", "Partially Refunded", "Voided"],
      default: "Pending",
    },
    currency: {
      type: String,
      default: "USD",
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    transactionReference: {
      type: String,
    },
    cardDetails: {
      cardType: String,
      last4: String,
      expiryMonth: String,
      expiryYear: String,
      cardholderName: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountName: String,
    },
    mobileMoneyDetails: {
      provider: String,
      phoneNumber: String,
      transactionId: String,
    },
    onlinePaymentDetails: {
      gateway: String,
      paymentId: String,
      payerEmail: String,
    },
    receiptNumber: String,
    receiptIssued: {
      type: Boolean,
      default: false,
    },
    receiptUrl: String,
    notes: String,
    paidAt: {
      type: Date,
      default: Date.now,
    },
    refundDetails: {
      amount: Number,
      reason: String,
      refundedAt: Date,
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundReference: String,
    },
    isDeposit: {
      type: Boolean,
      default: false,
    },
    isRefund: {
      type: Boolean,
      default: false,
    },
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
  { timestamps: true },
)

// Generate payment number before saving
paymentSchema.pre("save", async function (next) {
  if (!this.paymentNumber) {
    const year = new Date().getFullYear().toString().slice(-2)
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0")

    // Find the highest payment number for this year/month
    const latestPayment = await this.constructor
      .findOne({
        paymentNumber: new RegExp(`^PAY-${year}${month}-`),
      })
      .sort({ paymentNumber: -1 })

    let sequence = 1
    if (latestPayment) {
      const latestSequence = Number.parseInt(latestPayment.paymentNumber.split("-")[2])
      sequence = latestSequence + 1
    }

    this.paymentNumber = `PAY-${year}${month}-${sequence.toString().padStart(4, "0")}`
  }
  next()
})

// Generate receipt number when receipt is issued
paymentSchema.pre("save", async function (next) {
  if (this.receiptIssued && !this.receiptNumber) {
    const year = new Date().getFullYear().toString().slice(-2)
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0")

    // Find the highest receipt number for this year/month
    const latestReceipt = await this.constructor
      .findOne({
        receiptNumber: new RegExp(`^RCT-${year}${month}-`),
      })
      .sort({ receiptNumber: -1 })

    let sequence = 1
    if (latestReceipt) {
      const latestSequence = Number.parseInt(latestReceipt.receiptNumber.split("-")[2])
      sequence = latestSequence + 1
    }

    this.receiptNumber = `RCT-${year}${month}-${sequence.toString().padStart(4, "0")}`
  }
  next()
})

// Indexes for faster queries
paymentSchema.index({ invoice: 1 })
paymentSchema.index({ booking: 1 })
paymentSchema.index({ order: 1 })
paymentSchema.index({ guest: 1 })
paymentSchema.index({ paymentNumber: 1 }, { unique: true })
paymentSchema.index({ status: 1 })
paymentSchema.index({ paidAt: 1 })
paymentSchema.index({ method: 1 })

const Payment = mongoose.model("Payment", paymentSchema)
export default Payment
