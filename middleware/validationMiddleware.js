import { body, validationResult } from "express-validator"
import { ApiError } from "../utils/apiError.js"

// Validation result handler
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(new ApiError(errors.array()[0].msg, 400))
  }
  next()
}

// Event validation
export const validateEventRequest = [
  body("title")
    .notEmpty()
    .withMessage("Event title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Event title must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("start_date")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  body("end_date")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error("End date must be after start date")
      }
      return true
    }),

  body("venue_id").notEmpty().withMessage("Venue ID is required").isMongoId().withMessage("Invalid venue ID format"),

  body("event_type_id")
    .notEmpty()
    .withMessage("Event type ID is required")
    .isMongoId()
    .withMessage("Invalid event type ID format"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("status").optional().isIn(["draft", "confirmed", "cancelled", "completed"]).withMessage("Invalid status value"),

  body("attendees").optional().isInt({ min: 1 }).withMessage("Attendees must be a positive number"),

  validateRequest,
]

// Venue validation
export const validateVenueRequest = [
  body("name")
    .notEmpty()
    .withMessage("Venue name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Venue name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("capacity")
    .notEmpty()
    .withMessage("Capacity is required")
    .isInt({ min: 1 })
    .withMessage("Capacity must be a positive number"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("location").optional().isObject().withMessage("Location must be an object"),

  body("amenities").optional().isArray().withMessage("Amenities must be an array"),

  body("pricing").optional().isObject().withMessage("Pricing must be an object"),

  body("pricing.base_price").optional().isFloat({ min: 0 }).withMessage("Base price must be a positive number"),

  body("status").optional().isIn(["active", "inactive", "maintenance"]).withMessage("Invalid status value"),

  validateRequest,
]

// Booking validation
export const validateBookingRequest = [
  body("event_id").notEmpty().withMessage("Event ID is required").isMongoId().withMessage("Invalid event ID format"),

  body("customer")
    .notEmpty()
    .withMessage("Customer information is required")
    .isObject()
    .withMessage("Customer must be an object"),

  body("customer.name")
    .notEmpty()
    .withMessage("Customer name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Customer name must be between 3 and 100 characters"),

  body("customer.email")
    .notEmpty()
    .withMessage("Customer email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  body("customer.phone").optional().isMobilePhone().withMessage("Invalid phone number format"),

  body("services").optional().isArray().withMessage("Services must be an array"),

  body("services.*.service_id").optional().isMongoId().withMessage("Invalid service ID format"),

  body("services.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be a positive number"),

  body("payment").optional().isObject().withMessage("Payment must be an object"),

  body("payment.method")
    .optional()
    .isIn(["cash", "credit_card", "bank_transfer", "check"])
    .withMessage("Invalid payment method"),

  body("payment.status").optional().isIn(["pending", "partial", "completed"]).withMessage("Invalid payment status"),

  body("payment.amount").optional().isFloat({ min: 0 }).withMessage("Payment amount must be a positive number"),

  body("status")
    .optional()
    .isIn(["pending", "confirmed", "cancelled", "completed"])
    .withMessage("Invalid status value"),

  validateRequest,
]

// Event Type validation
export const validateEventTypeRequest = [
  body("name")
    .notEmpty()
    .withMessage("Event type name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Event type name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("color").optional().isHexColor().withMessage("Color must be a valid hex color code"),

  body("default_duration").optional().isInt({ min: 1 }).withMessage("Default duration must be a positive number"),

  validateRequest,
]

// Service validation
export const validateServiceRequest = [
  body("name")
    .notEmpty()
    .withMessage("Service name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Service name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("category")
    .optional()
    .isIn(["catering", "equipment", "decoration", "entertainment", "staffing", "other"])
    .withMessage("Invalid category"),

  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status value"),

  validateRequest,
]

// Package validation
export const validatePackageRequest = [
  body("name")
    .notEmpty()
    .withMessage("Package name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Package name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("event_type_id").optional().isMongoId().withMessage("Invalid event type ID format"),

  body("services").optional().isArray().withMessage("Services must be an array"),

  body("services.*.service_id").optional().isMongoId().withMessage("Invalid service ID format"),

  body("services.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be a positive number"),

  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status value"),

  validateRequest,
]

// Staffing validation
export const validateStaffingRequest = [
  body("event_id").notEmpty().withMessage("Event ID is required").isMongoId().withMessage("Invalid event ID format"),

  body("staff_id").notEmpty().withMessage("Staff ID is required").isMongoId().withMessage("Invalid staff ID format"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Role must be between 2 and 50 characters"),

  body("start_time")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid date"),

  body("end_time")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_time)) {
        throw new Error("End time must be after start time")
      }
      return true
    }),

  body("notes").optional().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),

  body("status")
    .optional()
    .isIn(["assigned", "confirmed", "completed", "cancelled"])
    .withMessage("Invalid status value"),

  validateRequest,
]

// Template validation
export const validateTemplateRequest = [
  body("name")
    .notEmpty()
    .withMessage("Template name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Template name must be between 3 and 100 characters"),

  body("description").optional().isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters"),

  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isMongoId().withMessage("Invalid hotel ID format"),

  body("event_type_id").optional().isMongoId().withMessage("Invalid event type ID format"),

  body("duration").optional().isInt({ min: 1 }).withMessage("Duration must be a positive number"),

  body("services").optional().isArray().withMessage("Services must be an array"),

  body("staffing").optional().isArray().withMessage("Staffing must be an array"),

  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status value"),

  validateRequest,
]

// Feedback validation
export const validateFeedbackRequest = [
  body("event_id").notEmpty().withMessage("Event ID is required").isMongoId().withMessage("Invalid event ID format"),

  body("customer_id").optional().isMongoId().withMessage("Invalid customer ID format"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comments").optional().isLength({ max: 1000 }).withMessage("Comments cannot exceed 1000 characters"),

  body("categories").optional().isObject().withMessage("Categories must be an object"),

  body("categories.venue").optional().isInt({ min: 1, max: 5 }).withMessage("Venue rating must be between 1 and 5"),

  body("categories.staff").optional().isInt({ min: 1, max: 5 }).withMessage("Staff rating must be between 1 and 5"),

  body("categories.food").optional().isInt({ min: 1, max: 5 }).withMessage("Food rating must be between 1 and 5"),

  body("categories.value").optional().isInt({ min: 1, max: 5 }).withMessage("Value rating must be between 1 and 5"),

  validateRequest,
]
