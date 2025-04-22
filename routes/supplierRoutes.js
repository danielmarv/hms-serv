import express from "express"
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems,
  toggleActiveStatus,
  addSupplierDocument,
  removeSupplierDocument,
} from "../controllers/supplierController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all suppliers
router.get("/", authorize(["admin", "manager", "inventory", "staff"]), getAllSuppliers)

// Get supplier by ID
router.get("/:id", validateObjectId("id"), authorize(["admin", "manager", "inventory", "staff"]), getSupplierById)

// Get supplier items
router.get("/:id/items", validateObjectId("id"), authorize(["admin", "manager", "inventory"]), getSupplierItems)

// Create new supplier
router.post("/", authorize(["admin", "manager", "inventory"]), createSupplier)

// Update supplier
router.put("/:id", validateObjectId("id"), authorize(["admin", "manager", "inventory"]), updateSupplier)

// Delete supplier
router.delete("/:id", validateObjectId("id"), authorize(["admin", "manager"]), deleteSupplier)

// Toggle supplier active status
router.patch(
  "/:id/toggle-status",
  validateObjectId("id"),
  authorize(["admin", "manager", "inventory"]),
  toggleActiveStatus,
)

// Add document to supplier
router.post("/:id/documents", validateObjectId("id"), authorize(["admin", "manager", "inventory"]), addSupplierDocument)

// Remove document from supplier
router.delete(
  "/:id/documents/:documentId",
  validateObjectId("id"),
  authorize(["admin", "manager", "inventory"]),
  removeSupplierDocument,
)

export default router
