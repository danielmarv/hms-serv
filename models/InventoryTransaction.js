import mongoose from "mongoose"

const inventoryTransactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["Purchase", "Usage", "Adjustment", "Waste", "Return", "Transfer"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    totalPrice: {
      type: Number,
      min: 0,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    referenceType: {
      type: String,
      enum: ["Order", "Invoice", "Adjustment", "Waste", "Return", "Transfer", "Other"],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
)

// Indexes for faster queries
inventoryTransactionSchema.index({ item: 1 })
inventoryTransactionSchema.index({ transactionType: 1 })
inventoryTransactionSchema.index({ createdAt: 1 })
inventoryTransactionSchema.index({ supplier: 1 })
inventoryTransactionSchema.index({ referenceId: 1 })

const InventoryTransaction = mongoose.model("InventoryTransaction", inventoryTransactionSchema)
export default InventoryTransaction
