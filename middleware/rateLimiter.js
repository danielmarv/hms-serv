import rateLimit from "express-rate-limit"

// Create a limiter for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Create a limiter for password reset attempts
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: "Too many password reset attempts, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
})

// Create a limiter for registration attempts
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  message: "Too many registration attempts, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
})

// Create a general API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
})
