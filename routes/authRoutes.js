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
  switchHotelContext,
} from "../controllers/authController.js"
import { authenticate } from "../middleware/auth.js"

const router = express.Router()

// Public routes
router.post("/register", register)
router.post("/login", login)
router.post("/refresh-token", refreshToken)
router.get("/verify-email/:token", verifyEmail)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

// Protected routes
router.use(authenticate)
router.post("/logout", logout)
router.post("/change-password", changePassword)
router.get("/me", getCurrentUser)
router.post("/switch-hotel", switchHotelContext)

export default router
