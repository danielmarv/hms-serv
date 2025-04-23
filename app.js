import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import mongoSanitize from "express-mongo-sanitize"
import xss from "xss-clean"
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

import errorHandler from "./middleware/errorHandler.js"
import { apiLimiter } from "./middleware/rateLimiter.js"

// Load environment variables
dotenv.config()

const app = express()

// Security middleware
app.use(helmet()) // Set security HTTP headers
app.use(cors()) // Enable CORS
app.use(express.json({ limit: "10kb" })) // Body parser, reading data from body into req.body
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
// app.use(
//     mongoSanitize({
//       replaceWith: "_", // replaces prohibited keys like $ or . with _
//       onSanitize: ({ req, key }) => {
//         console.warn(`Sanitized ${key} in request`)
//       }
//     })
//   )
  
// app.use(xss()) // Data sanitization against XSS
app.use(hpp()) // Prevent parameter pollution
app.use(compression()) // Compress responses

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

// Rate limiting
app.use("/api", apiLimiter)

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/analytics", analyticsRoutes)

// Room management module routes
app.use("/api/room-types", roomTypeRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/maintenance", maintenanceRoutes)
app.use("/api/housekeeping", housekeepingRoutes)

// Guest and booking management module routes
app.use("/api/guests", guestRoutes)
app.use("/api/bookings", bookingRoutes)

// Finance module routes
app.use("/api/invoices", invoiceRoutes)
app.use("/api/payments", paymentRoutes)

// Inventory management module routes
app.use("/api/inventory", inventoryRoutes)
app.use("/api/suppliers", supplierRoutes)

// Restaurant management module routes
app.use("/api/restaurant", restaurantRoutes)


// API health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  })
})




// Error handling middleware
app.use(errorHandler)

export default app
