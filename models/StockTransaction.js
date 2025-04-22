import mongoose from "mongoose"

const stockTransactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    type: {
      type: String,
      enum: ["restock", "usage", "wastage", "transfer", "return", "adjustment", "count"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit_price: {
      type: Number,
      min: 0,
    },
    total_cost: {
      type: Number,
      min: 0,
    },
    transaction_date: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: String,
      enum: ["Kitchen", "Housekeeping", "Maintenance", "Front Desk", "Restaurant", "Bar", "Spa", "Other"],
    },
    source_location: String,
    destination_location: String,
    reference_number: String,
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    invoice_number: String,
    expiry_date: Date,
    batch_number: String,
    reason: String,
    remarks: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "completed",
    },
  },
  { timestamps: true },
)

// Calculate total cost before saving
stockTransactionSchema.pre("save", function (next) {
  if (this.quantity && this.unit_price) {
    this.total_cost = Math.abs(this.quantity) * this.unit_price
  }
  next()
})

// Update inventory item stock after transaction is saved
stockTransactionSchema.post("save", async function () {
  try {
    const InventoryItem = mongoose.model("InventoryItem")
    const item = await InventoryItem.findById(this.item)

    if (!item) return

    let stockChange = 0

    switch (this.type) {
      case "restock":
      case "return":
        stockChange = this.quantity
        break
      case "usage":
      case "wastage":
        stockChange = -Math.abs(this.quantity)
        break
      case "transfer":
        stockChange = -Math.abs(this.quantity)
        break
      case "adjustment":
      case "count":
        // For adjustments and counts, the quantity is the new value, not a delta
        stockChange = this.quantity - item.currentStock
        break
    }

    // Update current stock
    item.currentStock = Math.max(0, item.currentStock + stockChange)

    // Update last restock date if applicable
    if (this.type === "restock") {
      item.lastRestockDate = this.transaction_date
    }

    // Update last count date if applicable
    if (this.type === "count") {
      item.lastCountDate = this.transaction_date
    }

    await item.save()
  } catch (error) {
    console.error("Error updating inventory after transaction:", error)
  }
})

// Indexes for faster queries
stockTransactionSchema.index({ item: 1 })
stockTransactionSchema.index({ type: 1 })
stockTransactionSchema.index({ transaction_date: 1 })
stockTransactionSchema.index({ department: 1 })
stockTransactionSchema.index({ performedBy: 1 })
stockTransactionSchema.index({ status: 1 })

const StockTransaction = mongoose.model("StockTransaction", stockTransactionSchema)
export default StockTransaction
