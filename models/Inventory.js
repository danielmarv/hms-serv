import mongoose from "mongoose"

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      enum: [
        "Meat",
        "Seafood",
        "Produce",
        "Dairy",
        "Bakery",
        "Dry Goods",
        "Spices",
        "Beverages",
        "Alcohol",
        "Cleaning",
        "Disposables",
        "Other",
      ],
      required: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "g", "l", "ml", "unit", "dozen", "box", "bag", "bottle", "can", "package", "other"],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    reorderPoint: {
      type: Number,
      required: true,
      min: 0,
      default: 20,
    },
    reorderQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },
    location: {
      type: String,
      default: "Main Storage",
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    supplierName: String,
    supplierCode: String,
    expiryDate: Date,
    isPerishable: {
      type: Boolean,
      default: false,
    },
    description: String,
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastOrderDate: Date,
    lastReceivedDate: Date,
    lastCountDate: Date,
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

// Virtual for total value
inventoryItemSchema.virtual("totalValue").get(function () {
  return this.currentStock * this.unitPrice
})

// Virtual for stock status
inventoryItemSchema.virtual("stockStatus").get(function () {
  if (this.currentStock <= this.minStockLevel) return "Critical"
  if (this.currentStock <= this.reorderPoint) return "Low"
  return "Adequate"
})

// Indexes for faster queries
inventoryItemSchema.index({ name: 1 })
inventoryItemSchema.index({ category: 1 })
inventoryItemSchema.index({ supplier: 1 })
inventoryItemSchema.index({ isActive: 1 })
inventoryItemSchema.index({ stockStatus: 1 })

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema)
export default InventoryItem
