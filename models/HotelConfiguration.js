import mongoose from "mongoose"

const hotelConfigurationSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
    },
    // General settings
    name: {
      type: String,
      required: true,
      trim: true,
    },
    legal_name: {
      type: String,
      required: true,
      trim: true,
    },
    tax_id: {
      type: String,
      required: true,
    },
    // Contact information
    contact: {
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
      },
      website: String,
      address: {
        street: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        postal_code: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
        },
      },
    },
    // Financial settings
    financial: {
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
      tax_rates: [
        {
          name: {
            type: String,
            required: true,
          },
          rate: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
          },
          is_default: {
            type: Boolean,
            default: false,
          },
        },
      ],
      invoice_prefix: {
        type: String,
        default: "INV",
      },
      receipt_prefix: {
        type: String,
        default: "RCP",
      },
      fiscal_year_start: {
        month: {
          type: Number,
          min: 1,
          max: 12,
          default: 1,
        },
        day: {
          type: Number,
          min: 1,
          max: 31,
          default: 1,
        },
      },
    },
    // Operational settings
    operational: {
      check_in_time: {
        type: String,
        default: "14:00",
      },
      check_out_time: {
        type: String,
        default: "11:00",
      },
      time_zone: {
        type: String,
        default: "UTC",
      },
      date_format: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY",
      },
      time_format: {
        type: String,
        enum: ["12h", "24h"],
        default: "12h",
      },
      week_start: {
        type: String,
        enum: ["sunday", "monday"],
        default: "sunday",
      },
      default_language: {
        type: String,
        default: "en",
      },
    },
    // Branding settings
    branding: {
      logo_url: String,
      favicon_url: String,
      primary_color: {
        type: String,
        default: "#1a73e8",
      },
      secondary_color: {
        type: String,
        default: "#f8f9fa",
      },
      accent_color: {
        type: String,
        default: "#fbbc04",
      },
      email_template: {
        header_image_url: String,
        footer_text: String,
        signature: String,
      },
    },
    // Feature toggles
    features: {
      enable_online_booking: {
        type: Boolean,
        default: true,
      },
      enable_room_service: {
        type: Boolean,
        default: true,
      },
      enable_housekeeping: {
        type: Boolean,
        default: true,
      },
      enable_maintenance: {
        type: Boolean,
        default: true,
      },
      enable_restaurant: {
        type: Boolean,
        default: true,
      },
      enable_spa: {
        type: Boolean,
        default: false,
      },
      enable_events: {
        type: Boolean,
        default: false,
      },
    },
    // Notification settings
    notifications: {
      email: {
        new_booking: {
          type: Boolean,
          default: true,
        },
        booking_confirmation: {
          type: Boolean,
          default: true,
        },
        check_in_reminder: {
          type: Boolean,
          default: true,
        },
        check_out_reminder: {
          type: Boolean,
          default: true,
        },
        payment_confirmation: {
          type: Boolean,
          default: true,
        },
      },
      sms: {
        new_booking: {
          type: Boolean,
          default: false,
        },
        booking_confirmation: {
          type: Boolean,
          default: false,
        },
        check_in_reminder: {
          type: Boolean,
          default: false,
        },
        check_out_reminder: {
          type: Boolean,
          default: false,
        },
        payment_confirmation: {
          type: Boolean,
          default: false,
        },
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

// Method to get default tax rate
hotelConfigurationSchema.methods.getDefaultTaxRate = function () {
  const defaultTax = this.financial.tax_rates.find((tax) => tax.is_default)
  return defaultTax ? defaultTax.rate : 0
}

// Method to format currency
hotelConfigurationSchema.methods.formatCurrency = function (amount) {
  const { code, symbol, position } = this.financial.currency
  const formattedAmount = amount.toFixed(2)
  return position === "before" ? `${symbol}${formattedAmount}` : `${formattedAmount}${symbol}`
}

// Method to get next invoice number
hotelConfigurationSchema.methods.getNextInvoiceNumber = async function () {
  // This would typically involve a counter in the database
  // For simplicity, we'll just return a placeholder
  return `${this.financial.invoice_prefix}-${Date.now()}`
}

const HotelConfiguration = mongoose.model("HotelConfiguration", hotelConfigurationSchema)
export default HotelConfiguration
