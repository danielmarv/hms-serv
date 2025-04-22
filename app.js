import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import mongoSanitize from "express-mongo-sanitize"
import xss from "xss-clean"
import hpp from "hpp"
import compression from "compression"
import dotenv from "dotenv"

import routes from "./routes/index.js"
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
app.use(mongoSanitize()) // Data sanitization against NoSQL query injection
app.use(xss()) // Data sanitization against XSS
app.use(hpp()) // Prevent parameter pollution
app.use(compression()) // Compress responses

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

// Rate limiting
app.use("/api", apiLimiter)

// Mount all routes
app.use(routes)

// API health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  })
})

// 404 handler
app.all("*", (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server!`,
  })
})

// Error handling middleware
app.use(errorHandler)

export default app
