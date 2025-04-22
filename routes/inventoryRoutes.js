import express from "express"
import {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStockLevel,
  getItemTransactions,
  getLowStockItems,
  getInventoryStats,
} from "../controllers/inventoryController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all inventory items
router.get("/", authorize(["admin", "manager", "inventory", "staff"]), getAllInventoryItems)

// Get low stock items
router.get("/low-stock", authorize(["admin", "manager", "inventory"]), getLowStockItems)

// Get inventory statistics
router.get("/stats", authorize(["admin", "manager", "inventory"]), getInventoryStats)

// Get inventory item by ID
router.get("/:id", validateObjectId("id"), authorize(["admin", "manager", "inventory", "staff"]), getInventoryItemById)

// Get item transactions
router.get(
  "/:id/transactions",
  validateObjectId("id"),
  authorize(["admin", "manager", "inventory"]),
  getItemTransactions,
)

// Create new inventory item
router.post("/", authorize(["admin", "manager", "inventory"]), createInventoryItem)

// Update inventory item
router.put("/:id", validateObjectId("id"), authorize(["admin", "manager", "inventory"]), updateInventoryItem)

// Delete inventory item
router.delete("/:id", validateObjectId("id"), authorize(["admin", "manager"]), deleteInventoryItem)

// Update stock level
router.patch(
  "/:id/stock",
  validateObjectId("id"),
  authorize(["admin", "manager", "inventory", "staff"]),
  updateStockLevel,
)

export default router
