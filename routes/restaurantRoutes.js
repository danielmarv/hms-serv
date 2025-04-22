import express from "express"
import {
  // Menu Item Controller
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleFeatured,
  // Table Controller
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  // Order Controller
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
} from "../controllers/restaurantController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// ===== Menu Item Routes =====
router.get("/menu-items", authorize(["admin", "manager", "restaurant", "staff"]), getAllMenuItems)
router.get(
  "/menu-items/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant", "staff"]),
  getMenuItemById,
)
router.post("/menu-items", authorize(["admin", "manager", "restaurant"]), createMenuItem)
router.put("/menu-items/:id", validateObjectId("id"), authorize(["admin", "manager", "restaurant"]), updateMenuItem)
router.delete("/menu-items/:id", validateObjectId("id"), authorize(["admin", "manager"]), deleteMenuItem)
router.patch(
  "/menu-items/:id/availability",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant"]),
  toggleAvailability,
)
router.patch(
  "/menu-items/:id/featured",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant"]),
  toggleFeatured,
)

// ===== Table Routes =====
router.get("/tables", authorize(["admin", "manager", "restaurant", "staff"]), getAllTables)
router.get("/tables/:id", validateObjectId("id"), authorize(["admin", "manager", "restaurant", "staff"]), getTableById)
router.post("/tables", authorize(["admin", "manager"]), createTable)
router.put("/tables/:id", validateObjectId("id"), authorize(["admin", "manager"]), updateTable)
router.delete("/tables/:id", validateObjectId("id"), authorize(["admin", "manager"]), deleteTable)
router.patch(
  "/tables/:id/status",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant", "staff"]),
  updateTableStatus,
)

// ===== Order Routes =====
router.get("/orders", authorize(["admin", "manager", "restaurant", "staff"]), getAllOrders)
router.get("/orders/stats", authorize(["admin", "manager", "restaurant"]), getOrderStats)
router.get("/orders/:id", validateObjectId("id"), authorize(["admin", "manager", "restaurant", "staff"]), getOrderById)
router.post("/orders", authorize(["admin", "manager", "restaurant", "staff"]), createOrder)
router.put("/orders/:id", validateObjectId("id"), authorize(["admin", "manager", "restaurant", "staff"]), updateOrder)
router.patch(
  "/orders/:id/status",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant", "staff"]),
  updateOrderStatus,
)
router.patch(
  "/orders/:id/payment",
  validateObjectId("id"),
  authorize(["admin", "manager", "restaurant", "staff"]),
  updatePaymentStatus,
)

export default router
