import express from "express"
import {
  getAllKitchenOrders,
  getKitchenOrderById,
  createKitchenOrder,
  updateKitchenOrder,
  updateKitchenOrderStatus,
  updateKitchenOrderItemStatus,
  assignChef,
  getKitchenStats,
} from "../controllers/kitchenController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Kitchen Order Routes
router.get("/orders", authorize(["admin", "manager", "kitchen", "restaurant", "staff"]), getAllKitchenOrders)
router.get("/orders/stats", authorize(["admin", "manager", "kitchen", "restaurant"]), getKitchenStats)
router.get(
  "/orders/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "kitchen", "restaurant", "staff"]),
  getKitchenOrderById,
)
router.post("/orders", authorize(["admin", "manager", "restaurant", "staff"]), createKitchenOrder)
router.put(
  "/orders/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "kitchen", "restaurant"]),
  updateKitchenOrder,
)
router.patch(
  "/orders/:id/status",
  validateObjectId("id"),
  authorize(["admin", "manager", "kitchen", "restaurant"]),
  updateKitchenOrderStatus,
)
router.patch(
  "/orders/:id/item-status",
  validateObjectId("id"),
  authorize(["admin", "manager", "kitchen", "restaurant", "staff"]),
  updateKitchenOrderItemStatus,
)
router.patch(
  "/orders/:id/assign-chef",
  validateObjectId("id"),
  authorize(["admin", "manager", "kitchen", "restaurant"]),
  assignChef,
)

export default router
