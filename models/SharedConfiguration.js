import mongoose from "mongoose"

// Define the shared configuration schema for hotel chains
const sharedConfigurationSchema = new mongoose.Schema(
  {
    chainCode: {
      type: String,
      required: [true, "Chain code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Chain name is required"],
      trim: true,
    },
    // Branding that can be shared across all hotels in the chain
    branding: {
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
    },
    // Document prefixes that can be shared or overridden
    documentPrefixes: {
      invoice: {
        prefix: {
          type: String,
          default: "INV",
          maxlength: 5,
        },
        format: {
          type: String,
          default: "{prefix}-{hotelCode}-{year}{month}-{number}",
        },
      },
      receipt: {
        prefix: {
          type: String,
          default: "RCP",
          maxlength: 5,
        },
        format: {
          type: String,
          default: "{prefix}-{hotelCode}-{year}{month}-{number}",
        },
      },
      booking: {
        prefix: {
          type: String,
          default: "BKG",
          maxlength: 5,
        },
        format: {
          type: String,
          default: "{prefix}-{hotelCode}-{year}{month}-{number}",
        },
      },
      guest: {
        prefix: {
          type: String,
          default: "GST",
          maxlength: 5,
        },
        format: {
          type: String,
          default: "{prefix}-{hotelCode}-{number}",
        },
      },
    },
    // System settings that can be shared
    systemSettings: {
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
    },
    // Which settings can be overridden by individual hotels
    overrideSettings: {
      branding: {
        type: Boolean,
        default: false,
      },
      documentPrefixes: {
        type: Boolean,
        default: true,
      },
      systemSettings: {
        type: Boolean,
        default: true,
      },
    },
    // Audit fields
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

// Create and export the model
const SharedConfiguration = mongoose.model("SharedConfiguration", sharedConfigurationSchema)
export default SharedConfiguration
