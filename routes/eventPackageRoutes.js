import express from "express"
import * as eventPackageController from "../controllers/eventPackageController.js"
import { authenticate } from "../middleware/auth.js"
import { checkPermission } from "../middleware/permissionMiddleware.js"
import { validateRequest } from "../middleware/validationMiddleware.js"

const router = express.Router()

// Apply authentication to all routes
router.use(authenticate)

// Get all packages
router.get("/", checkPermission("events:view"), eventPackageController.getAllPackages)

// Get package by ID
router.get("/:id", checkPermission("events:view"), eventPackageController.getPackageById)

// Get packages by event type
router.get("/event-type/:eventTypeId", checkPermission("events:view"), eventPackageController.getPackagesByEventType)

// Calculate package price
router.post(
  "/calculate-price",
  checkPermission("events:view"),
  validateRequest({
    packageId: "required|mongoId",
    guestCount: "required|integer|min:1",
    additionalServices: "array",
  }),
  eventPackageController.calculatePackagePrice,
)

// Create new package
router.post(
  "/",
  checkPermission("events:create"),
  validateRequest({
    name: "required|string|max:100",
    description: "string|max:500",
    hotel: "required|mongoId",
    eventType: "required|mongoId",
    basePrice: "required|numeric|min:0",
    services: "array",
    minGuests: "integer|min:1",
    maxGuests: "integer|min:1",
  }),
  eventPackageController.createPackage,
)

// Update package
router.put(
  "/:id",
  checkPermission("events:update"),
  validateRequest({
    name: "string|max:100",
    description: "string|max:500",
    hotel: "mongoId",
    eventType: "mongoId",
    basePrice: "numeric|min:0",
    services: "array",
    minGuests: "integer|min:1",
    maxGuests: "integer|min:1",
    isActive: "boolean",
  }),
  eventPackageController.updatePackage,
)

// Delete package
router.delete("/:id", checkPermission("events:delete"), eventPackageController.deletePackage)

export default router
