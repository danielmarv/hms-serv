const { body, validationResult } = require("express-validator")
const { errorResponse } = require("../utils/responseHandler")

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation error", 400, { errors: errors.array() })
  }
  next()
}

// Event venue validation
exports.validateEventVenue = [
  body("name")
    .notEmpty()
    .withMessage("Venue name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1 })
    .withMessage("Capacity must be a positive number"),

  body("pricePerHour")
    .notEmpty()
    .withMessage("Price per hour is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("amenities").optional().isArray().withMessage("Amenities must be an array"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("location").optional().isObject().withMessage("Location must be an object"),

  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),

  handleValidationErrors,
]

// Event type validation
exports.validateEventType = [
  body("name")
    .notEmpty()
    .withMessage("Event type name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("basePrice").optional().isFloat({ min: 0 }).withMessage("Base price must be a positive number"),

  body("color").optional().isString().withMessage("Color must be a string"),

  body("icon").optional().isString().withMessage("Icon must be a string"),

  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),

  handleValidationErrors,
]

// Event booking validation
exports.validateEventBooking = [
  body("venue").notEmpty().withMessage("Venue is required").isMongoId().withMessage("Invalid venue ID"),

  body("eventType").notEmpty().withMessage("Event type is required").isMongoId().withMessage("Invalid event type ID"),

  body("customer").notEmpty().withMessage("Customer is required").isMongoId().withMessage("Invalid customer ID"),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid date"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error("End time must be after start time")
      }
      return true
    }),

  body("attendees")
    .notEmpty()
    .withMessage("Number of attendees is required")
    .isInt({ min: 1 })
    .withMessage("Attendees must be a positive number"),

  body("basePrice").optional().isFloat({ min: 0 }).withMessage("Base price must be a positive number"),

  body("services").optional().isArray().withMessage("Services must be an array"),

  body("services.*.service").optional().isMongoId().withMessage("Invalid service ID"),

  body("services.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be a positive number"),

  body("specialRequests")
    .optional()
    .isString()
    .withMessage("Special requests must be a string")
    .isLength({ max: 1000 })
    .withMessage("Special requests cannot exceed 1000 characters"),

  body("status")
    .optional()
    .isIn(["pending", "confirmed", "cancelled", "completed"])
    .withMessage("Status must be pending, confirmed, cancelled, or completed"),

  handleValidationErrors,
]

// Event service validation
exports.validateEventService = [
  body("name")
    .notEmpty()
    .withMessage("Service name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(["catering", "decoration", "equipment", "entertainment", "staffing", "other"])
    .withMessage("Invalid category"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("unit").optional().isString().withMessage("Unit must be a string"),

  body("image").optional().isString().withMessage("Image must be a string URL"),

  body("isAvailable").optional().isBoolean().withMessage("isAvailable must be a boolean"),

  handleValidationErrors,
]
