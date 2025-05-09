import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import hpp from "hpp"
import compression from "compression"
import dotenv from "dotenv"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import roomTypeRoutes from "./routes/roomTypeRoutes.js"
import roomRoutes from "./routes/roomRoutes.js"
import maintenanceRoutes from "./routes/maintenanceRoutes.js"
import housekeepingRoutes from "./routes/housekeepingRoutes.js"
import guestRoutes from "./routes/guestRoutes.js"
import bookingRoutes from "./routes/bookingRoutes.js"
import invoiceRoutes from "./routes/invoiceRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import inventoryRoutes from "./routes/inventoryRoutes.js"
import supplierRoutes from "./routes/supplierRoutes.js"
import restaurantRoutes from "./routes/restaurantRoutes.js"
import analyticsRoutes from "./routes/analyticsRoutes.js"
import roleRoutes from "./routes/roleRoutes.js"
import permissionRoutes from "./routes/permissionRoutes.js"
import crossHotelRoutes from "./routes/crossHotelRoutes.js"
import dataSyncRoutes from "./routes/dataSyncRoutes.js"
import hotelChainRoutes from "./routes/hotelChainRoutes.js"
import hotelRoutes from "./routes/hotelRoutes.js"
import kitchenRoutes from "./routes/kitchenRoutes.js"
// Event management routes
import eventRoutes from "./routes/eventRoutes.js"
import eventVenueRoutes from "./routes/eventVenueRoutes.js"
import eventTypeRoutes from "./routes/eventTypeRoutes.js"
import eventBookingRoutes from "./routes/eventBookingRoutes.js"
import eventServiceRoutes from "./routes/eventServiceRoutes.js"
import eventPackageRoutes from "./routes/eventPackageRoutes.js"
import eventTemplateRoutes from "./routes/eventTemplateRoutes.js"
import eventStaffingRoutes from "./routes/eventStaffingRoutes.js"
import eventFeedbackRoutes from "./routes/eventFeedbackRoutes.js"
import eventCalendarRoutes from "./routes/eventCalendarRoutes.js"
import eventReportRoutes from "./routes/eventReportRoutes.js"

import errorHandler from "./middleware/errorHandler.js"
import { apiLimiter } from "./middleware/rateLimiter.js"

dotenv.config()

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))

app.use(hpp())
app.use(compression())

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

app.use("/api", apiLimiter)

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/analytics", analyticsRoutes)

app.use("/api/room-types", roomTypeRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/roles", roleRoutes)
app.use("/api/maintenance", maintenanceRoutes)
app.use("/api/housekeeping", housekeepingRoutes)
app.use("/api/permissions", permissionRoutes)
app.use("/api/cross-hotel", crossHotelRoutes)
app.use("/api/data-sync", dataSyncRoutes)
app.use("/api/chains", hotelChainRoutes)
app.use("/api/kitchen", kitchenRoutes)

// Event related routes
app.use("/api/events", eventRoutes)
app.use("/api/event-types", eventTypeRoutes)
app.use("/api/event-service", eventServiceRoutes)
app.use("/api/event-package", eventPackageRoutes)
app.use("/api/event-template", eventTemplateRoutes)
app.use("/api/event-staffing", eventStaffingRoutes)
app.use("/api/event-feedback", eventFeedbackRoutes)
app.use("/api/event-calendar", eventCalendarRoutes)
app.use("/api/event-report", eventReportRoutes)
app.use("/api/event-booking", eventBookingRoutes)

// Hotel management
app.use("/api/hotels", hotelRoutes)
// app.use("/api/hotel-configurations", hotelConfigurationRoutes)

app.use("/api/guests", guestRoutes)
app.use("/api/bookings", bookingRoutes)

app.use("/api/invoices", invoiceRoutes)
app.use("/api/payments", paymentRoutes)

app.use("/api/inventory", inventoryRoutes)
app.use("/api/suppliers", supplierRoutes)

app.use("/api/restaurant", restaurantRoutes)


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  })
})

app.use(errorHandler)

export default app
