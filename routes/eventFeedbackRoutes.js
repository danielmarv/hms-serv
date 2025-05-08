import express from "express"
import { authenticate, authorize, isOwnerOrAdmin } from "../middleware/auth.js"
import * as eventFeedbackController from "../controllers/eventFeedbackController.js"
import { validateFeedbackRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all feedback routes
router.use(authenticate)

// Feedback management routes
router.get("/", authorize(["feedback.view"]), eventFeedbackController.getAllFeedback)

router.get("/:id", authorize(["feedback.view"]), eventFeedbackController.getFeedbackById)

router.post("/", authorize(["feedback.create"]), validateFeedbackRequest, eventFeedbackController.createFeedback)

router.put(
  "/:id",
  authorize(["feedback.update"]),
  isOwnerOrAdmin("EventFeedback"),
  validateFeedbackRequest,
  eventFeedbackController.updateFeedback,
)

router.delete(
  "/:id",
  authorize(["feedback.delete"]),
  isOwnerOrAdmin("EventFeedback"),
  eventFeedbackController.deleteFeedback,
)

// Event feedback routes
router.get("/event/:eventId", authorize(["feedback.view"]), eventFeedbackController.getEventFeedback)

export default router
