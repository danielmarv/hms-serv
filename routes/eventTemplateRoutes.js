import express from "express"
import * as eventTemplateController from "../controllers/eventTemplateController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"
import { validateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all templates
router.get("/", checkPermission("events:view"), eventTemplateController.getAllTemplates)

// Get template by ID
router.get("/:id", checkPermission("events:view"), eventTemplateController.getTemplateById)

// Get templates by event type
router.get("/event-type/:eventTypeId", checkPermission("events:view"), eventTemplateController.getTemplatesByEventType)

// Create new template
router.post(
  "/",
  checkPermission("events:create"),
  validateRequest({
    name: "required|string|max:100",
    description: "string|max:500",
    hotel: "required|mongoId",
    eventType: "required|mongoId",
    venue: "mongoId",
    duration: "numeric|min:0.5",
    setupTime: "numeric|min:0",
    teardownTime: "numeric|min:0",
    services: "array",
    guestCapacity: "integer|min:1",
    defaultPrice: "numeric|min:0",
    isActive: "boolean",
    settings: "object",
  }),
  eventTemplateController.createTemplate,
)

// Update template
router.put(
  "/:id",
  checkPermission("events:update"),
  validateRequest({
    name: "string|max:100",
    description: "string|max:500",
    hotel: "mongoId",
    eventType: "mongoId",
    venue: "mongoId",
    duration: "numeric|min:0.5",
    setupTime: "numeric|min:0",
    teardownTime: "numeric|min:0",
    services: "array",
    guestCapacity: "integer|min:1",
    defaultPrice: "numeric|min:0",
    isActive: "boolean",
    settings: "object",
  }),
  eventTemplateController.updateTemplate,
)

// Delete template
router.delete("/:id", checkPermission("events:delete"), eventTemplateController.deleteTemplate)

// Create event from template
router.post(
  "/:templateId/create-event",
  checkPermission("events:create"),
  validateRequest({
    eventName: "required|string|max:100",
    customer: "required|mongoId",
    startDate: "required|date",
    endDate: "required|date",
    guestCount: "integer|min:1",
    specialRequests: "string|max:1000",
    customFields: "object",
  }),
  eventTemplateController.createEventFromTemplate,
)

// Save event as template
router.post(
  "/from-event/:eventId",
  checkPermission("events:create"),
  validateRequest({
    name: "required|string|max:100",
    description: "string|max:500",
  }),
  eventTemplateController.saveEventAsTemplate,
)

export default router
