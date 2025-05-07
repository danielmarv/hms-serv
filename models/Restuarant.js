import mongoose from "mongoose"

const restaurantSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // Location and Association
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    location: {
      floor: String,
      building: String,
      directions: String,
    },

    // Contact Information
    contactInfo: {
      phone: String,
      email: String,
      website: String,
    },

    // Media
    images: [String],
    logoUrl: String,
    virtualTourUrl: String,

    // Categorization
    type: {
      type: String,
      enum: [
        "Fine Dining",
        "Casual Dining",
        "Buffet",
        "Café",
        "Bar",
        "Lounge",
        "Room Service",
        "Food Court",
        "Specialty",
        "Poolside",
        "Rooftop",
      ],
      required: true,
    },
    cuisineTypes: [
      {
        type: String,
        enum: [
          "American",
          "Italian",
          "Mexican",
          "Chinese",
          "Japanese",
          "Thai",
          "Indian",
          "French",
          "Mediterranean",
          "Middle Eastern",
          "Greek",
          "Spanish",
          "Korean",
          "Vietnamese",
          "African",
          "Caribbean",
          "Fusion",
          "Other",
        ],
      },
    ],

    // Operational Details
    capacity: {
      type: Number,
      min: [0, "Capacity cannot be negative"],
    },
    operatingHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean },
    },
    specialHours: [
      {
        date: Date,
        open: String,
        close: String,
        closed: Boolean,
        reason: String,
      },
    ],

    // Features and Amenities
    features: {
      hasBar: Boolean,
      hasLiveMusic: Boolean,
      hasOutdoorSeating: Boolean,
      hasPrivateDining: Boolean,
      hasTakeout: Boolean,
      hasDelivery: Boolean,
      hasWifi: Boolean,
      isKidFriendly: Boolean,
      isPetFriendly: Boolean,
      isWheelchairAccessible: Boolean,
      hasValet: Boolean,
      hasSelfParking: Boolean,
    },

    // Reservation Settings
    reservations: {
      acceptsReservations: {
        type: Boolean,
        default: true,
      },
      reservationPlatforms: [String], // e.g., "OpenTable", "Resy", "Direct"
      reservationUrl: String,
      reservationPhone: String,
      reservationEmail: String,
      maxPartySize: Number,
      minAdvanceTime: Number, // in hours
      maxAdvanceTime: Number, // in days
      timeSlotDuration: Number, // in minutes
      turnoverTime: Number, // in minutes
    },

    // Policies
    policies: {
      dressCode: {
        type: String,
        enum: ["Casual", "Smart Casual", "Business Casual", "Formal", "Black Tie"],
      },
      minimumAge: Number,
      corkageFee: Number,
      serviceCharge: Number, // percentage
      gratuityPolicy: String,
      cancellationPolicy: String,
      noShowFee: Number,
    },

    // Menu Information
    menus: [
      {
        name: String, // e.g., "Breakfast", "Lunch", "Dinner", "Brunch", "Happy Hour"
        description: String,
        availableDays: {
          monday: Boolean,
          tuesday: Boolean,
          wednesday: Boolean,
          thursday: Boolean,
          friday: Boolean,
          saturday: Boolean,
          sunday: Boolean,
        },
        availableTimeStart: String,
        availableTimeEnd: String,
        items: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuItem",
          },
        ],
      },
    ],

    // Staff
    staff: {
      manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      headChef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      hostessCount: Number,
      waiterCount: Number,
      bartenderCount: Number,
      kitchenStaffCount: Number,
    },

    // Sections and Tables
    sections: [
      {
        name: String,
        description: String,
        capacity: Number,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Financial Information
    financials: {
      averageCheck: Number,
      revenueTarget: Number,
      costPercentageTarget: Number,
      laborCostPercentageTarget: Number,
    },

    // Status
    status: {
      type: String,
      enum: ["Active", "Closed", "Renovating", "Coming Soon"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Ratings and Reviews
    ratings: {
      averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      ratingCount: {
        type: Number,
        default: 0,
      },
    },

    // Social Media
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      yelp: String,
      tripadvisor: String,
    },

    // Audit Information
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for current status (open/closed)
restaurantSchema.virtual("isOpenNow").get(function () {
  if (!this.isActive || this.status !== "Active") return false

  // Check special hours for today
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const specialHoursToday = this.specialHours.find((sh) => sh.date.toISOString().split("T")[0] === todayStr)

  if (specialHoursToday) {
    if (specialHoursToday.closed) return false

    return isTimeInRange(today, specialHoursToday.open, specialHoursToday.close)
  }

  // Check regular hours
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const dayOfWeek = days[today.getDay()]
  const hours = this.operatingHours[dayOfWeek]

  if (!hours || hours.closed) return false

  return isTimeInRange(today, hours.open, hours.close)
})

// Helper function to check if current time is within range
function isTimeInRange(date, openTime, closeTime) {
  if (!openTime || !closeTime) return false

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const currentTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (openTime > closeTime) {
    return currentTime >= openTime || currentTime <= closeTime
  }

  return currentTime >= openTime && currentTime <= closeTime
}

// Virtual for tables (populated from Table model)
restaurantSchema.virtual("tables", {
  ref: "Table",
  localField: "_id",
  foreignField: "restaurant",
  justOne: false,
})

// Indexes for faster queries
restaurantSchema.index({ name: 1, hotel: 1 }, { unique: true })
restaurantSchema.index({ hotel: 1 })
restaurantSchema.index({ type: 1 })
restaurantSchema.index({ cuisineTypes: 1 })
restaurantSchema.index({ status: 1 })
restaurantSchema.index({ isActive: 1 })
restaurantSchema.index({ "ratings.averageRating": 1 })

const Restaurant = mongoose.model("Restaurant", restaurantSchema)
export default Restaurant
