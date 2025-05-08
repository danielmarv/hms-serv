import express from "express"
import * as eventFeedbackController from "../controllers/eventFeedbackController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"
import { validateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all feedback
router.get("/", checkPermission("events:view"), eventFeedbackController.getAllFeedback)

// Get feedback statistics
router.get("/stats", checkPermission("events:view"), eventFeedbackController.getFeedbackStats)

// Get feedback by ID
router.get("/:id", checkPermission("events:view"), eventFeedbackController.getFeedbackById)

// Create new feedback
router.post(
  "/",
  checkPermission("events:create"),
  validateRequest({
    booking: "required|mongoId",
    rating: "required|integer|min:1|max:5",
    comments: "string|max:1000",
    categories: "array",
  }),
  eventFeedbackController.createFeedback,
)

// Respond to feedback
router.patch(
  "/:id/respond",
  checkPermission("events:update"),
  validateRequest({
    response: "required|string|max:1000",
  }),
  eventFeedbackController.respondToFeedback,
)

export default router
