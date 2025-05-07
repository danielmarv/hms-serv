import mongoose from "mongoose"

const menuItemSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    cost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, "Tax rate cannot be negative"],
    },

    // Categorization
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Appetizer",
        "Soup",
        "Salad",
        "Main Course",
        "Dessert",
        "Beverage",
        "Alcohol",
        "Side",
        "Breakfast",
        "Lunch",
        "Dinner",
        "Special",
        "Kids Menu",
        "Vegan",
        "Vegetarian",
        "Gluten-Free",
      ],
    },
    subcategory: String,
    cuisineType: {
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

    // Media
    imageUrl: String,
    galleryImages: [String],
    videoUrl: String,

    // Availability
    availability: {
      type: Boolean,
      default: true,
    },
    availableForDineIn: {
      type: Boolean,
      default: true,
    },
    availableForTakeout: {
      type: Boolean,
      default: true,
    },
    availableForDelivery: {
      type: Boolean,
      default: true,
    },
    availableForRoomService: {
      type: Boolean,
      default: true,
    },

    // Preparation Details
    preparationTime: {
      type: Number,
      min: [0, "Preparation time cannot be negative"],
      default: 15, // in minutes
    },
    cookingInstructions: String,
    chefNotes: String,

    // Dietary Information
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    isDairyFree: {
      type: Boolean,
      default: false,
    },
    isNutFree: {
      type: Boolean,
      default: false,
    },
    isHalal: {
      type: Boolean,
      default: false,
    },
    isKosher: {
      type: Boolean,
      default: false,
    },
    allergens: [String],

    // Nutritional Information
    nutritionalInfo: {
      calories: Number,
      protein: Number, // in grams
      carbohydrates: Number, // in grams
      fat: Number, // in grams
      sugar: Number, // in grams
      sodium: Number, // in mg
      fiber: Number, // in grams
    },

    // Flavor Profile
    spicyLevel: {
      type: Number,
      min: 0,
      max: 5,
      default: 0, // 0: Not spicy, 1-5: Increasing spiciness
    },

    // Ingredients and Recipe
    ingredients: [String],
    recipe: {
      type: String,
      select: false, // Not returned in normal queries for security
    },

    // Metadata
    tags: [String],
    featured: {
      type: Boolean,
      default: false,
    },
    popularity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Menu Placement
    menuSections: [String], // e.g., "Breakfast Menu", "Lunch Menu", "Room Service"
    displayOrder: {
      type: Number,
      default: 999,
    },

    // Time-based Availability
    availableDays: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: true },
    },
    availableTimeStart: String, // e.g., "07:00"
    availableTimeEnd: String, // e.g., "22:00"

    // Seasonal Availability
    seasonalAvailability: {
      isSeasonalItem: { type: Boolean, default: false },
      startDate: Date,
      endDate: Date,
      seasonName: String, // e.g., "Summer", "Christmas"
    },

    // Promotions and Discounts
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isDiscounted: {
      type: Boolean,
      default: false,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    promotionText: String,

    // Customization Options
    customizationOptions: [
      {
        name: String,
        options: [
          {
            name: String,
            price: Number,
            default: Boolean,
          },
        ],
        required: Boolean,
        multiSelect: Boolean,
      },
    ],

    // Pairings and Recommendations
    recommendedPairings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
      },
    ],
    recommendedAddOns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
      },
    ],

    // Inventory Management
    inventoryTracking: {
      enabled: { type: Boolean, default: false },
      stockQuantity: { type: Number, min: 0 },
      lowStockThreshold: { type: Number, min: 0 },
      outOfStockBehavior: {
        type: String,
        enum: ["Hide", "Show as unavailable", "Allow backorder"],
        default: "Show as unavailable",
      },
    },

    // Reviews and Ratings
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

    // Hotel and Restaurant Association
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
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

    // Version Control
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        version: Number,
        changes: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: Date,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Published",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Calculate discounted price before saving
menuItemSchema.pre("save", function (next) {
  if (this.isDiscounted && this.discountPercentage > 0) {
    this.discountedPrice = this.price * (1 - this.discountPercentage / 100)
  } else {
    this.discountedPrice = this.price
    this.isDiscounted = false
    this.discountPercentage = 0
  }
  next()
})

// Virtual for profit margin
menuItemSchema.virtual("profitMargin").get(function () {
  if (!this.cost || this.cost === 0) return null
  return ((this.price - this.cost) / this.price) * 100
})

// Virtual for current price (either regular or discounted)
menuItemSchema.virtual("currentPrice").get(function () {
  return this.isDiscounted ? this.discountedPrice : this.price
})

// Check if item is available now based on days and times
menuItemSchema.virtual("isAvailableNow").get(function () {
  if (!this.availability) return false

  // Check day of week
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const today = days[new Date().getDay()]
  if (!this.availableDays[today]) return false

  // Check time of day if time restrictions exist
  if (this.availableTimeStart && this.availableTimeEnd) {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`

    if (currentTime < this.availableTimeStart || currentTime > this.availableTimeEnd) {
      return false
    }
  }

  // Check seasonal availability
  if (this.seasonalAvailability && this.seasonalAvailability.isSeasonalItem) {
    const now = new Date()
    if (this.seasonalAvailability.startDate && now < this.seasonalAvailability.startDate) return false
    if (this.seasonalAvailability.endDate && now > this.seasonalAvailability.endDate) return false
  }

  // Check inventory if tracking is enabled
  if (this.inventoryTracking && this.inventoryTracking.enabled) {
    if (this.inventoryTracking.stockQuantity <= 0) {
      return this.inventoryTracking.outOfStockBehavior === "Allow backorder"
    }
  }

  return true
})

// Indexes for faster queries
menuItemSchema.index({ name: 1, hotel: 1 }, { unique: true })
menuItemSchema.index({ category: 1 })
menuItemSchema.index({ subcategory: 1 })
menuItemSchema.index({ cuisineType: 1 })
menuItemSchema.index({ availability: 1 })
menuItemSchema.index({ featured: 1 })
menuItemSchema.index({ isDiscounted: 1 })
menuItemSchema.index({ menuSections: 1 })
menuItemSchema.index({ hotel: 1 })
menuItemSchema.index({ restaurant: 1 })
menuItemSchema.index({ "ratings.averageRating": 1 })
menuItemSchema.index({ status: 1 })
menuItemSchema.index({ tags: 1 })
menuItemSchema.index(
  {
    name: "text",
    description: "text",
    ingredients: "text",
    tags: "text",
  },
  {
    weights: {
      name: 10,
      tags: 5,
      ingredients: 3,
      description: 1,
    },
    name: "menu_item_text_search",
  },
)

const MenuItem = mongoose.model("MenuItem", menuItemSchema)
export default MenuItem
