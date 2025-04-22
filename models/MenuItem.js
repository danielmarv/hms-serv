import mongoose from "mongoose"

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
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
      ],
      required: true,
    },
    subcategory: String,
    imageUrl: String,
    availability: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      min: 0,
      default: 15, // in minutes
    },
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
    allergens: [String],
    spicyLevel: {
      type: Number,
      min: 0,
      max: 3,
      default: 0, // 0: Not spicy, 1: Mild, 2: Medium, 3: Hot
    },
    calories: {
      type: Number,
      min: 0,
    },
    ingredients: [String],
    tags: [String],
    featured: {
      type: Boolean,
      default: false,
    },
    menuSections: [String], // e.g., "Breakfast Menu", "Lunch Menu", "Room Service"
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
    popularity: {
      type: Number,
      min: 0,
      default: 0,
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
  { timestamps: true },
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

// Indexes for faster queries
menuItemSchema.index({ name: 1 })
menuItemSchema.index({ category: 1 })
menuItemSchema.index({ availability: 1 })
menuItemSchema.index({ featured: 1 })
menuItemSchema.index({ isDiscounted: 1 })
menuItemSchema.index({ menuSections: 1 })

const MenuItem = mongoose.model("MenuItem", menuItemSchema)
export default MenuItem
