import express from "express"
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
} from "../controllers/authController.js"
import { authenticate } from "../middleware/auth.js"
import {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange,
  validate,
} from "../middleware/validators.js"
import { loginLimiter, passwordResetLimiter, registrationLimiter } from "../middleware/rateLimiter.js"

const router = express.Router()

// Public routes
router.post("/register", registrationLimiter, validateUserRegistration, validate, register)
router.post("/login", loginLimiter, validateUserLogin, validate, login)
router.post("/refresh-token", refreshToken)
router.get("/verify-email/:token", verifyEmail)
router.post("/forgot-password", passwordResetLimiter, validatePasswordResetRequest, validate, forgotPassword)
router.post("/reset-password/:token", validatePasswordReset, validate, resetPassword)

// Protected routes
router.use(authenticate) // Apply authentication middleware to all routes below
router.post("/logout", logout)
router.post("/change-password", validatePasswordChange, validate, changePassword)
router.get("/me", getCurrentUser)

export default router
