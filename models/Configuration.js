import mongoose from "mongoose"

// Define the branding schema
const brandingSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: "#1a73e8",
    validate: {
      validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
      message: (props) => `${props.value} is not a valid hex color!`,
    },
  },
  secondaryColor: {
    type: String,
    default: "#f8f9fa",
    validate: {
      validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
      message: (props) => `${props.value} is not a valid hex color!`,
    },
  },
  accentColor: {
    type: String,
    default: "#fbbc04",
    validate: {
      validator: (v) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
      message: (props) => `${props.value} is not a valid hex color!`,
    },
  },
  logo: {
    url: String,
    altText: String,
    width: Number,
    height: Number,
  },
  favicon: {
    url: String,
    width: Number,
    height: Number,
  },
  font: {
    primary: {
      type: String,
      default: "Roboto",
    },
    secondary: {
      type: String,
      default: "Open Sans",
    },
  },
})

// Define the address schema
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, "Street address is required"],
  },
  city: {
    type: String,
    required: [true, "City is required"],
  },
  state: {
    type: String,
    required: [true, "State/Province is required"],
  },
  postalCode: {
    type: String,
    required: [true, "Postal/ZIP code is required"],
  },
  country: {
    type: String,
    required: [true, "Country is required"],
  },
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
})

// Define the contact schema
const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    validate: {
      validator: (v) => /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(v),
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    validate: {
      validator: (v) => /^\S+@\S+\.\S+$/.test(v),
      message: (props) => `${props.value} is not a valid email address!`,
    },
  },
  website: {
    type: String,
    validate: {
      validator: (v) => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v),
      message: (props) => `${props.value} is not a valid website URL!`,
    },
  },
  fax: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },
})

// Define the document prefixes schema
const documentPrefixesSchema = new mongoose.Schema({
  invoice: {
    prefix: {
      type: String,
      default: "INV",
      maxlength: 5,
    },
    startingNumber: {
      type: Number,
      default: 1000,
    },
    format: {
      type: String,
      default: "{prefix}-{year}{month}-{number}",
      validate: {
        validator: (v) => v.includes("{prefix}") && v.includes("{number}"),
        message: "Format must include {prefix} and {number} placeholders",
      },
    },
  },
  receipt: {
    prefix: {
      type: String,
      default: "RCP",
      maxlength: 5,
    },
    startingNumber: {
      type: Number,
      default: 1000,
    },
    format: {
      type: String,
      default: "{prefix}-{year}{month}-{number}",
      validate: {
        validator: (v) => v.includes("{prefix}") && v.includes("{number}"),
        message: "Format must include {prefix} and {number} placeholders",
      },
    },
  },
  booking: {
    prefix: {
      type: String,
      default: "BKG",
      maxlength: 5,
    },
    startingNumber: {
      type: Number,
      default: 1000,
    },
    format: {
      type: String,
      default: "{prefix}-{year}{month}-{number}",
      validate: {
        validator: (v) => v.includes("{prefix}") && v.includes("{number}"),
        message: "Format must include {prefix} and {number} placeholders",
      },
    },
  },
  guest: {
    prefix: {
      type: String,
      default: "GST",
      maxlength: 5,
    },
    startingNumber: {
      type: Number,
      default: 1000,
    },
    format: {
      type: String,
      default: "{prefix}-{number}",
      validate: {
        validator: (v) => v.includes("{prefix}") && v.includes("{number}"),
        message: "Format must include {prefix} and {number} placeholders",
      },
    },
  },
})

// Define the system settings schema
const systemSettingsSchema = new mongoose.Schema({
  dateFormat: {
    type: String,
    enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    default: "MM/DD/YYYY",
  },
  timeFormat: {
    type: String,
    enum: ["12h", "24h"],
    default: "12h",
  },
  currency: {
    code: {
      type: String,
      default: "USD",
    },
    symbol: {
      type: String,
      default: "$",
    },
    position: {
      type: String,
      enum: ["before", "after"],
      default: "before",
    },
  },
  timezone: {
    type: String,
    default: "UTC",
  },
  language: {
    type: String,
    default: "en-US",
  },
  measurementSystem: {
    type: String,
    enum: ["metric", "imperial"],
    default: "metric",
  },
})

// Define the main configuration schema
const configurationSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
    },
    hotelName: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
    },
    legalName: {
      type: String,
      required: [true, "Legal business name is required"],
      trim: true,
    },
    taxId: {
      type: String,
      required: [true, "Tax ID is required"],
    },
    address: {
      type: addressSchema,
      required: [true, "Address is required"],
    },
    contact: {
      type: contactSchema,
      required: [true, "Contact information is required"],
    },
    branding: {
      type: brandingSchema,
      default: () => ({}),
    },
    documentPrefixes: {
      type: documentPrefixesSchema,
      default: () => ({}),
    },
    systemSettings: {
      type: systemSettingsSchema,
      default: () => ({}),
    },
    setupCompleted: {
      type: Boolean,
      default: false,
    },
    setupStep: {
      type: Number,
      default: 1,
    },
    active: {
      type: Boolean,
      default: true,
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

// Add methods to generate document numbers
configurationSchema.methods.generateDocumentNumber = function (type) {
  if (!this.documentPrefixes[type]) {
    throw new Error(`Document type ${type} not found in configuration`)
  }

  const config = this.documentPrefixes[type]
  const prefix = config.prefix
  const number = config.startingNumber

  // Increment the starting number for next use
  this.documentPrefixes[type].startingNumber = number + 1

  // Format the document number according to the format string
  let formattedNumber = config.format
  const now = new Date()

  formattedNumber = formattedNumber.replace("{prefix}", prefix)
  formattedNumber = formattedNumber.replace("{number}", number.toString().padStart(4, "0"))
  formattedNumber = formattedNumber.replace("{year}", now.getFullYear().toString())
  formattedNumber = formattedNumber.replace("{month}", (now.getMonth() + 1).toString().padStart(2, "0"))
  formattedNumber = formattedNumber.replace("{day}", now.getDate().toString().padStart(2, "0"))

  return formattedNumber
}

// Create and export the model
const Configuration = mongoose.model("Configuration", configurationSchema)
export default Configuration
