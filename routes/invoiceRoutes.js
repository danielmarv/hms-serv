import express from "express"
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  sendInvoiceByEmail,
  getInvoiceStats,
} from "../controllers/invoiceController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Get all invoices
router.get("/", authorize(["admin", "manager", "accountant", "receptionist"]), getAllInvoices)

// Get invoice statistics
router.get("/stats", authorize(["admin", "manager", "accountant"]), getInvoiceStats)

// Get invoice by ID
router.get(
  "/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  getInvoiceById,
)

// Create new invoice
router.post("/", authorize(["admin", "manager", "accountant", "receptionist"]), createInvoice)

// Update invoice
router.put("/:id", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), updateInvoice)

// Delete invoice
router.delete("/:id", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), deleteInvoice)

// Issue invoice
router.patch("/:id/issue", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), issueInvoice)

// Cancel invoice
router.patch("/:id/cancel", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), cancelInvoice)

// Record payment
router.patch(
  "/:id/payment",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  recordPayment,
)

// Send invoice by email
router.post(
  "/:id/email",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  sendInvoiceByEmail,
)

export default router
