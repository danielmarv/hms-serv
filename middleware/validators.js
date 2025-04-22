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
      throw new Error(`Invalid ${paramName}`)
    }
    return true
  })
}

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
    .matches(/^\+?[0-9\s\-$$$$]+$/)
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
    .matches(/^\+?[0-9\s\-$$$$]+$/)
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
