import mongoose from "mongoose"

const menuItemIngredientSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "g", "l", "ml", "unit", "dozen", "box", "bag", "bottle", "can", "package", "other"],
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
    notes: String,
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

// Indexes for faster queries
menuItemIngredientSchema.index({ menuItem: 1 })
menuItemIngredientSchema.index({ inventoryItem: 1 })

const MenuItemIngredient = mongoose.model("MenuItemIngredient", menuItemIngredientSchema)
export default MenuItemIngredient
