import mongoose from "mongoose"

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    contact_person: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    alternative_phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    supplies: [String],
    categories: [String],
    tax_id: String,
    payment_terms: String,
    credit_limit: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    bank_details: {
      bank_name: String,
      account_number: String,
      account_name: String,
      swift_code: String,
    },
    notes: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    lead_time: {
      type: Number,
      min: 0,
      default: 0,
    },
    minimum_order: {
      type: Number,
      min: 0,
      default: 0,
    },
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

// Generate supplier code if not provided
supplierSchema.pre("save", async function (next) {
  if (!this.code && this.isNew) {
    const prefix = "SUP"

    // Find the highest code
    const latestSupplier = await this.constructor
      .findOne({
        code: new RegExp(`^${prefix}-`),
      })
      .sort({ code: -1 })

    let sequence = 1
    if (latestSupplier) {
      const latestSequence = Number.parseInt(latestSupplier.code.split("-")[1])
      sequence = latestSequence + 1
    }

    this.code = `${prefix}-${sequence.toString().padStart(4, "0")}`
  }
  next()
})

// Virtual for full address
supplierSchema.virtual("full_address").get(function () {
  const address = this.address
  if (!address) return ""

  const parts = []
  if (address.street) parts.push(address.street)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.zip) parts.push(address.zip)
  if (address.country) parts.push(address.country)

  return parts.join(", ")
})

// Indexes for faster queries
supplierSchema.index({ name: 1 })
supplierSchema.index({ code: 1 }, { unique: true, sparse: true })
supplierSchema.index({ is_active: 1 })
supplierSchema.index({ supplies: 1 })
supplierSchema.index({ categories: 1 })

const Supplier = mongoose.model("Supplier", supplierSchema)
export default Supplier
