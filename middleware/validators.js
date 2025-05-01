import { body, param, validationResult } from "express-validator"
import mongoose from "mongoose"

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  next()
}

// Validate MongoDB ObjectId
export const validateObjectId = (paramName) => {
  return param(paramName).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${paramName}`);
    }
    return true;
  });
};

// User registration validation
export const validateUserRegistration = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-$$]+$/)
    .withMessage("Invalid phone number format"),

  body("gender").optional().isIn(["male", "female", "other"]).withMessage("Gender must be male, female, or other"),

  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const date = new Date(value)
      const now = new Date()
      if (date > now) {
        throw new Error("Date of birth cannot be in the future")
      }
      return true
    }),
]

// User login validation
export const validateUserLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
]

// Password reset request validation
export const validatePasswordResetRequest = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
]

// Password reset validation
export const validatePasswordReset = [
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match")
      }
      return true
    }),
]

// User update validation
export const validateUserUpdate = [
  body("full_name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("email").optional().trim().isEmail().withMessage("Invalid email format").normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-$$]+$/)
    .withMessage("Invalid phone number format"),

  body("gender").optional().isIn(["male", "female", "other"]).withMessage("Gender must be male, female, or other"),

  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const date = new Date(value)
      const now = new Date()
      if (date > now) {
        throw new Error("Date of birth cannot be in the future")
      }
      return true
    }),

  body("status")
    .optional()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Status must be active, inactive, or suspended"),

  body("role")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid role ID")
      }
      return true
    }),

  body("custom_permissions")
    .optional()
    .isArray()
    .withMessage("Custom permissions must be an array")
    .custom((value) => {
      if (!value.every((id) => mongoose.Types.ObjectId.isValid(id))) {
        throw new Error("Invalid permission ID in custom permissions")
      }
      return true
    }),
]

// Password change validation
export const validatePasswordChange = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    )
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password cannot be the same as current password")
      }
      return true
    }),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match")
      }
      return true
    }),
]

// Create room type validation
export const validateCreateRoomType = [
  body("name").trim().notEmpty().withMessage("Room type name is required"),
  body("basePrice").isNumeric().withMessage("Base price must be a number").toFloat(),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("maxOccupancy").isInt({ min: 1 }).withMessage("Maximum occupancy must be at least 1").toInt(),
]

// Update room type validation
export const validateUpdateRoomType = [
  body("name").optional().trim(),
  body("basePrice").optional().isNumeric().withMessage("Base price must be a number").toFloat(),
  body("category").optional().trim(),
  body("maxPccupancy").optional().isInt({ min: 1 }).withMessage("Maximum occupancy must be at least 1").toInt(),
]

// Create room validation
export const validateCreateRoom = [
  body("number").trim().notEmpty().withMessage("Room number is required"),
  body("room_type")
    .notEmpty()
    .withMessage("Room type is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room type ID")
      }
      return true
    }),
  body("floor").trim().notEmpty().withMessage("Floor is required"),
  body("building").optional().trim(),
  body("status")
    .optional()
    .isIn(["available", "occupied", "maintenance", "cleaning", "reserved", "out_of_order"])
    .withMessage("Invalid status"),
]

// Update room validation
export const validateUpdateRoom = [
  body("number").optional().trim(),
  body("room_type")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room type ID")
      }
      return true
    }),
  body("floor").optional().trim(),
  body("building").optional().trim(),
  body("status")
    .optional()
    .isIn(["available", "occupied", "maintenance", "cleaning", "reserved", "out_of_order"])
    .withMessage("Invalid status"),
]

// Create maintenance validation
export const validateCreateMaintenance = [
  body("room")
    .notEmpty()
    .withMessage("Room is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room ID")
      }
      return true
    }),
  body("issue_type").trim().notEmpty().withMessage("Issue type is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),
]

// Update maintenance validation
export const validateUpdateMaintenance = [
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "resolved", "unresolved"])
    .withMessage("Status must be pending, in_progress, resolved, or unresolved"),
  body("assigned_to")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid user ID")
      }
      return true
    }),
  body("resolution").optional().trim(),
  body("actual_cost").optional().isNumeric().withMessage("Actual cost must be a number").toFloat(),
]

// Create housekeeping validation
export const validateCreateHousekeeping = [
  body("room")
    .notEmpty()
    .withMessage("Room is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room ID")
      }
      return true
    }),
  body("schedule_date")
    .notEmpty()
    .withMessage("Schedule date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "completed", "skipped"])
    .withMessage("Status must be pending, in_progress, completed, or skipped"),
  body("assigned_to")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid user ID")
      }
      return true
    }),
]

// Update housekeeping validation
export const validateUpdateHousekeeping = [
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "completed", "skipped"])
    .withMessage("Status must be pending, in_progress, completed, or skipped"),
  body("assigned_to")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid user ID")
      }
      return true
    }),
  body("notes").optional().trim(),
  body("completion_time").optional().isISO8601().withMessage("Invalid date format"),
]

// Bulk create housekeeping validation
export const validateBulkCreateHousekeeping = [
  body("schedules")
    .isArray()
    .withMessage("Schedules must be an array")
    .notEmpty()
    .withMessage("At least one schedule is required"),
  body("schedules.*.room")
    .notEmpty()
    .withMessage("Room is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room ID")
      }
      return true
    }),
  body("schedules.*.schedule_date")
    .notEmpty()
    .withMessage("Schedule date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
]

// Create guest validation
export const validateCreateGuest = [
  body("full_name").trim().notEmpty().withMessage("Full name is required"),
  body("email").optional().trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
  body("nationality").optional().trim(),
  body("id_type").optional().isIn(["passport", "national_id", "driver_license", "other"]),
  body("id_number").optional().trim(),
]

// Update guest validation
export const validateUpdateGuest = [
  body("full_name").optional().trim(),
  body("email").optional().trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
  body("phone").optional().trim(),
  body("nationality").optional().trim(),
  body("id_type").optional().isIn(["passport", "national_id", "driver_license", "other"]),
  body("id_number").optional().trim(),
]

// Create invoice validation
export const validateCreateInvoice = [
  body("guest")
    .notEmpty()
    .withMessage("Guest is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid guest ID")
      }
      return true
    }),
  body("items").isArray().withMessage("Items must be an array").notEmpty().withMessage("At least one item is required"),
  body("items.*.description").trim().notEmpty().withMessage("Item description is required"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1").toInt(),
  body("items.*.unitPrice").isNumeric().withMessage("Unit price must be a number").toFloat(),
  body("subtotal").isNumeric().withMessage("Subtotal must be a number").toFloat(),
  body("taxTotal").isNumeric().withMessage("Tax total must be a number").toFloat(),
  body("discountTotal").isNumeric().withMessage("Discount total must be a number").toFloat(),
  body("total").isNumeric().withMessage("Total must be a number").toFloat(),
]

// Update invoice validation
export const validateUpdateInvoice = [
  body("items").optional().isArray().withMessage("Items must be an array"),
  body("items.*.description").optional().trim(),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1").toInt(),
  body("items.*.unitPrice").optional().isNumeric().withMessage("Unit price must be a number").toFloat(),
  body("subtotal").optional().isNumeric().withMessage("Subtotal must be a number").toFloat(),
  body("taxTotal").optional().isNumeric().withMessage("Tax total must be a number").toFloat(),
  body("discountTotal").optional().isNumeric().withMessage("Discount total must be a number").toFloat(),
  body("total").optional().isNumeric().withMessage("Total must be a number").toFloat(),
  body("status").optional().isIn(["Draft", "Issued", "Paid", "Partially Paid", "Overdue", "Cancelled", "Refunded"]),
]

// Create payment validation
export const validateCreatePayment = [
  body("guest")
    .notEmpty()
    .withMessage("Guest is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid guest ID")
      }
      return true
    }),
  body("amountPaid").isNumeric().withMessage("Amount paid must be a number").toFloat(),
  body("method")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["Cash", "Credit Card", "Debit Card", "Mobile Money", "Bank Transfer", "Online", "Voucher", "Other"]),
]

// Update payment validation
export const validateUpdatePayment = [
  body("method")
    .optional()
    .isIn(["Cash", "Credit Card", "Debit Card", "Mobile Money", "Bank Transfer", "Online", "Voucher", "Other"]),
  body("status").optional().isIn(["Pending", "Completed", "Failed", "Refunded", "Partially Refunded", "Voided"]),
]

// Create inventory item validation
export const validateCreateInventoryItem = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "Food",
      "Beverage",
      "Cleaning",
      "Toiletries",
      "Linen",
      "Office",
      "Maintenance",
      "Equipment",
      "Furniture",
      "Other",
    ]),
  body("unit")
    .notEmpty()
    .withMessage("Unit is required")
    .isIn(["piece", "kg", "g", "l", "ml", "box", "carton", "pack", "set", "pair", "other"]),
  body("unitPrice").isNumeric().withMessage("Unit price must be a number").toFloat(),
]

// Update inventory item validation
export const validateUpdateInventoryItem = [
  body("name").optional().trim(),
  body("category")
    .optional()
    .isIn([
      "Food",
      "Beverage",
      "Cleaning",
      "Toiletries",
      "Linen",
      "Office",
      "Maintenance",
      "Equipment",
      "Furniture",
      "Other",
    ]),
  body("unit").optional().isIn(["piece", "kg", "g", "l", "ml", "box", "carton", "pack", "set", "pair", "other"]),
  body("unitPrice").optional().isNumeric().withMessage("Unit price must be a number").toFloat(),
]

// Create supplier validation
export const validateCreateSupplier = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("contact_person").optional().trim(),
  body("phone").optional().trim(),
  body("email").optional().trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
]

// Update supplier validation
export const validateUpdateSupplier = [
  body("name").optional().trim(),
  body("contact_person").optional().trim(),
  body("phone").optional().trim(),
  body("email").optional().trim().isEmail().withMessage("Invalid email format").normalizeEmail(),
]

// Create menu item validation
export const validateCreateMenuItem = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("price").isNumeric().withMessage("Price must be a number").toFloat(),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "Appetizer",
      "Soup",
      "Salad",
      "Main Course",
      "Dessert",
      "Beverage",
      "Alcohol",
      "Side",
      "Breakfast",
      "Lunch",
      "Dinner",
      "Special",
    ]),
]

// Update menu item validation
export const validateUpdateMenuItem = [
  body("name").optional().trim(),
  body("price").optional().isNumeric().withMessage("Price must be a number").toFloat(),
  body("category")
    .optional()
    .isIn([
      "Appetizer",
      "Soup",
      "Salad",
      "Main Course",
      "Dessert",
      "Beverage",
      "Alcohol",
      "Side",
      "Breakfast",
      "Lunch",
      "Dinner",
      "Special",
    ]),
]

// Create table validation
export const validateCreateTable = [
  body("number").trim().notEmpty().withMessage("Table number is required"),
  body("section").trim().notEmpty().withMessage("Section is required"),
  body("capacity").isInt({ min: 1 }).withMessage("Capacity must be at least 1").toInt(),
]

// Update table validation
export const validateUpdateTable = [
  body("number").optional().trim(),
  body("section").optional().trim(),
  body("capacity").optional().isInt({ min: 1 }).withMessage("Capacity must be at least 1").toInt(),
]

// Create order validation
export const validateCreateOrder = [
  body("items").isArray().withMessage("Items must be an array").notEmpty().withMessage("At least one item is required"),
  body("items.*.menuItem")
    .notEmpty()
    .withMessage("Menu item is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid menu item ID")
      }
      return true
    }),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1").toInt(),
]

// Update order validation
export const validateUpdateOrder = [
  body("items").optional().isArray().withMessage("Items must be an array"),
  body("items.*.menuItem")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid menu item ID")
      }
      return true
    }),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1").toInt(),
]

// Create booking validation
export const validateCreateBooking = [
  body("guest")
    .notEmpty()
    .withMessage("Guest is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid guest ID")
      }
      return true
    }),
  body("room")
    .notEmpty()
    .withMessage("Room is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room ID")
      }
      return true
    }),
  body("check_in").notEmpty().withMessage("Check-in date is required").isISO8601().withMessage("Invalid date format"),
  body("check_out").notEmpty().withMessage("Check-out date is required").isISO8601().withMessage("Invalid date format"),
  body("number_of_guests").isInt({ min: 1 }).withMessage("Number of guests must be at least 1").toInt(),
  body("total_amount").isNumeric().withMessage("Total amount must be a number").toFloat(),
]

// Update booking validation
export const validateUpdateBooking = [
  body("guest")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid guest ID")
      }
      return true
    }),
  body("room")
    .optional()
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid room ID")
      }
      return true
    }),
  body("check_in").optional().isISO8601().withMessage("Invalid date format"),
  body("check_out").optional().isISO8601().withMessage("Invalid date format"),
  body("number_of_guests").optional().isInt({ min: 1 }).withMessage("Number of guests must be at least 1").toInt(),
  body("total_amount").optional().isNumeric().withMessage("Total amount must be a number").toFloat(),
  body("status")
    .optional()
    .isIn(["confirmed", "checked_in", "checked_out", "cancelled", "no_show"])
    .withMessage("Invalid status"),
]
