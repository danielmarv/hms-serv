import express from "express"
import { authenticate, authorizeRoles } from "../middleware/auth.js"
import {
  getOccupancyRate,
  getRevenueStats,
  getBookingTrends,
  getGuestDemographics,
  getRoomTypePopularity,
  getMaintenanceStats,
  getDashboardStats,
} from "../controllers/analyticsController.js"

const router = express.Router()

// Protect all routes
router.use(authenticate)

// Restrict to admin and manager roles
router.use(authorizeRoles("admin", "manager"))

// Analytics routes
router.get("/occupancy", getOccupancyRate)
router.get("/revenue", getRevenueStats)
router.get("/bookings", getBookingTrends)
router.get("/guests", getGuestDemographics)
router.get("/room-types", getRoomTypePopularity)
router.get("/maintenance", getMaintenanceStats)
router.get("/dashboard", getDashboardStats)

export default router
