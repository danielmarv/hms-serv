import express from "express"
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  processRefund,
  issueReceipt,
  sendReceiptByEmail,
  getPaymentStats,
} from "../controllers/paymentController.js"
import { authenticate, authorize } from "../middleware/auth.js"
import { validateObjectId } from "../middleware/validators.js"

const router = express.Router()

router.use(authenticate)

router.get("/", authorize(["admin", "manager", "accountant", "receptionist"]), getAllPayments)

router.get("/stats", authorize(["admin", "manager", "accountant"]), getPaymentStats)

router.get(
  "/:id",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  getPaymentById,
)

router.post("/", authorize(["admin", "manager", "accountant", "receptionist"]), createPayment)

router.put("/:id", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), updatePayment)

router.delete("/:id", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), deletePayment)

router.patch("/:id/refund", validateObjectId("id"), authorize(["admin", "manager", "accountant"]), processRefund)

// Issue receipt
router.patch(
  "/:id/receipt",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  issueReceipt,
)

// Send receipt by email
router.post(
  "/:id/email",
  validateObjectId("id"),
  authorize(["admin", "manager", "accountant", "receptionist"]),
  sendReceiptByEmail,
)

export default router
