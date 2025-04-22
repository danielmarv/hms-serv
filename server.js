import mongoose from "mongoose"
import dotenv from "dotenv"
import app from "./app.js"

// Load environment variables
dotenv.config()

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...")
  console.error(err.name, err.message, err.stack)
  process.exit(1)
})

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB")
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

// Start server
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...")
  console.error(err.name, err.message)
  server.close(() => {
    process.exit(1)
  })
})

// Handle SIGTERM
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully")
  server.close(() => {
    console.log("💥 Process terminated!")
  })
})
