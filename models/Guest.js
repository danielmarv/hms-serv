import mongoose from "mongoose"

const guestSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (props) => `${props.value} is not a valid email!`,
      },
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dob: {
      type: Date,
      validate: {
        validator: (v) => v < new Date(),
        message: () => "Date of birth must be in the past",
      },
    },
    nationality: {
      type: String,
      trim: true,
    },
    id_type: {
      type: String,
      enum: ["passport", "national_id", "driver_license", "other"],
    },
    id_number: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    id_expiry: Date,
    id_scan: String, // URL to uploaded document
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zip: { type: String, trim: true },
    },
    preferences: {
      bed_type: {
        type: String,
        enum: ["single", "double", "queen", "king", "twin", "sofa", "bunk"],
      },
      smoking: Boolean,
      floor_preference: String,
      room_location: String,
      dietary_requirements: [String],
      special_requests: String,
      amenities: [String],
    },
    loyalty_program: {
      member: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
      tier: {
        type: String,
        enum: ["standard", "silver", "gold", "platinum"],
        default: "standard",
      },
      member_since: Date,
      membership_number: String,
    },
    marketing_preferences: {
      email_opt_in: { type: Boolean, default: false },
      sms_opt_in: { type: Boolean, default: false },
      mail_opt_in: { type: Boolean, default: false },
    },
    notes: String,
    tags: [String],
    vip: { type: Boolean, default: false },
    blacklisted: { type: Boolean, default: false },
    blacklist_reason: String,
    company: {
      name: String,
      position: String,
      address: String,
      tax_id: String,
    },
    emergency_contact: {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },
    stay_history: {
      total_stays: { type: Number, default: 0 },
      last_stay: Date,
      average_stay_length: { type: Number, default: 0 },
      total_spent: { type: Number, default: 0 },
      favorite_room_type: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType" },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// Indexes for faster lookups
guestSchema.index({ email: 1, phone: 1 })
guestSchema.index({ "loyalty_program.membership_number": 1 })
guestSchema.index({ vip: 1 })
guestSchema.index({ blacklisted: 1 })

// Virtual for full address
guestSchema.virtual("full_address").get(function () {
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

// Virtual for age
guestSchema.virtual("age").get(function () {
  if (!this.dob) return null
  const today = new Date()
  const birthDate = new Date(this.dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
})

// Method to update stay history
guestSchema.methods.updateStayHistory = async function (stayLength, amount, roomType) {
  this.stay_history.total_stays += 1
  this.stay_history.last_stay = new Date()

  // Update average stay length
  const totalNights = this.stay_history.average_stay_length * (this.stay_history.total_stays - 1) + stayLength
  this.stay_history.average_stay_length = totalNights / this.stay_history.total_stays

  // Update total spent
  this.stay_history.total_spent += amount

  // Update favorite room type (simple algorithm - most recent)
  if (roomType) {
    this.stay_history.favorite_room_type = roomType
  }

  await this.save()
}

const Guest = mongoose.model("Guest", guestSchema)
export default Guest
