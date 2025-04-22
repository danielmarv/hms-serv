import { ApiError } from "../utils/apiError.js"

const errorHandler = (err, req, res, next) => {
  console.error("Error Handler:", err)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => error.message)
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}`,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  })
}

export default errorHandler
