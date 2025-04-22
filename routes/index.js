import express from "express"
import authRoutes from "./authRoutes.js"
import userRoutes from "./userRoutes.js"
import roomTypeRoutes from "./roomTypeRoutes.js"
import roomRoutes from "./roomRoutes.js"
import maintenanceRoutes from "./maintenanceRoutes.js"
import housekeepingRoutes from "./housekeepingRoutes.js"
import guestRoutes from "./guestRoutes.js"
import bookingRoutes from "./bookingRoutes.js"
import invoiceRoutes from "./invoiceRoutes.js"
import paymentRoutes from "./paymentRoutes.js"
import inventoryRoutes from "./inventoryRoutes.js"
import supplierRoutes from "./supplierRoutes.js"
import restaurantRoutes from "./restaurantRoutes.js"

const router = express.Router()

// Authentication and user management routes
router.use("/api/auth", authRoutes)
router.use("/api/users", userRoutes)

// Room management module routes
router.use("/api/room-types", roomTypeRoutes)
router.use("/api/rooms", roomRoutes)
router.use("/api/maintenance", maintenanceRoutes)
router.use("/api/housekeeping", housekeepingRoutes)

// Guest and booking management module routes
router.use("/api/guests", guestRoutes)
router.use("/api/bookings", bookingRoutes)

// Finance module routes
router.use("/api/invoices", invoiceRoutes)
router.use("/api/payments", paymentRoutes)

// Inventory management module routes
router.use("/api/inventory", inventoryRoutes)
router.use("/api/suppliers", supplierRoutes)

// Restaurant management module routes
router.use("/api/restaurant", restaurantRoutes)

export default router
