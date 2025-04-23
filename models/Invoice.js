import mongoose from "mongoose"

const invoiceSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      // Removed index: true since we're using schema.index() below
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: Date,
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, min: 0 }, // Auto-calculated: quantity * unitPrice
        date: { type: Date, default: Date.now },
        category: {
          type: String,
          enum: ["room", "food", "beverage", "service", "amenity", "tax", "other"],
          default: "other",
        },
        taxable: { type: Boolean, default: true },
        discount: { type: Number, default: 0, min: 0 },
        notes: String,
      },
    ],
    taxes: [
      {
        name: { type: String, required: true },
        percentage: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    discounts: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ["percentage", "fixed"], default: "fixed" },
        value: { type: Number, min: 0 }, // Original value before calculation
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["Draft", "Issued", "Paid", "Partially Paid", "Overdue", "Cancelled", "Refunded"],
      default: "Draft",
    },
    notes: String,
    paymentTerms: String,
    paymentInstructions: String,
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    isBillingAddressSameAsGuest: { type: Boolean, default: true },
    isCompanyBilling: { type: Boolean, default: false },
    companyDetails: {
      name: String,
      taxId: String,
      contactPerson: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zip: String,
      },
    },
    emailSent: { type: Boolean, default: false },
    emailSentDate: Date,
    printCount: { type: Number, default: 0 },
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

// Calculate item totals before saving
invoiceSchema.pre("save", function (next) {
  // Calculate each item's total
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.total = item.quantity * item.unitPrice - (item.discount || 0)
    })
  }

  // Calculate balance
  this.balance = this.total - this.amountPaid

  // Update status based on payment
  if (this.balance <= 0) {
    this.status = "Paid"
  } else if (this.amountPaid > 0) {
    this.status = "Partially Paid"
  } else if (this.status === "Draft") {
    // Keep as draft if it's still a draft
  } else {
    // Check if overdue
    if (this.dueDate && new Date() > this.dueDate) {
      this.status = "Overdue"
    } else {
      this.status = "Issued"
    }
  }

  next()
})

// Generate invoice number before saving
invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear().toString().slice(-2)
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0")

    // Find the highest invoice number for this year/month
    const latestInvoice = await this.constructor
      .findOne({
        invoiceNumber: new RegExp(`^INV-${year}${month}-`),
      })
      .sort({ invoiceNumber: -1 })

    let sequence = 1
    if (latestInvoice) {
      const latestSequence = Number.parseInt(latestInvoice.invoiceNumber.split("-")[2])
      sequence = latestSequence + 1
    }

    this.invoiceNumber = `INV-${year}${month}-${sequence.toString().padStart(4, "0")}`
  }
  next()
})

// Indexes for faster queries
invoiceSchema.index({ guest: 1 })
invoiceSchema.index({ booking: 1 })
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true })
invoiceSchema.index({ status: 1 })
invoiceSchema.index({ issuedDate: 1 })
invoiceSchema.index({ dueDate: 1 })

const Invoice = mongoose.model("Invoice", invoiceSchema)
export default Invoice
