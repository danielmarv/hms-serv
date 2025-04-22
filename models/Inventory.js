import mongoose from "mongoose"

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      required: true,
      enum: [
        "Food",
        "Beverage",
        "Cleaning",
        "Toiletries",
        "Linen",
        "Office",
        "Maintenance",
        "Equipment",
        "Furniture",
        "Other",
      ],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    barcode: String,
    unit: {
      type: String,
      required: true,
      enum: ["piece", "kg", "g", "l", "ml", "box", "carton", "pack", "set", "pair", "other"],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    expiryDate: Date,
    isPerishable: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: String,
    tags: [String],
    notes: String,
    lastRestockDate: Date,
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

// Generate SKU if not provided
inventoryItemSchema.pre("save", async function (next) {
  if (!this.sku && this.isNew) {
    const category = this.category.substring(0, 3).toUpperCase()

    // Find the highest SKU for this category
    const latestItem = await this.constructor
      .findOne({
        sku: new RegExp(`^${category}-`),
      })
      .sort({ sku: -1 })

    let sequence = 1
    if (latestItem) {
      const latestSequence = Number.parseInt(latestItem.sku.split("-")[1])
      sequence = latestSequence + 1
    }

    this.sku = `${category}-${sequence.toString().padStart(5, "0")}`
  }
  next()
})

// Virtual for stock status
inventoryItemSchema.virtual("stockStatus").get(function () {
  if (this.currentStock <= this.minStockLevel) {
    return "Low"
  } else if (this.currentStock >= this.maxStockLevel) {
    return "Overstocked"
  } else if (this.currentStock <= this.reorderPoint) {
    return "Reorder"
  } else {
    return "Normal"
  }
})

// Indexes for faster queries
inventoryItemSchema.index({ category: 1 })
inventoryItemSchema.index({ sku: 1 }, { unique: true, sparse: true })
inventoryItemSchema.index({ name: 1 })
inventoryItemSchema.index({ supplier: 1 })
inventoryItemSchema.index({ isActive: 1 })

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema)
export default InventoryItem
