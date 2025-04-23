import jwt from "jsonwebtoken"
import crypto from "crypto"

const tokenBlacklist = new Set()

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "7d",
  })
}

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  })
}

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
}

// Blacklist a token
export const blacklistToken = (token) => {
  tokenBlacklist.add(token)
}

// Check if token is blacklisted
export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token)
}

// Generate password reset token
export const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex")
  const hash = crypto.createHash("sha256").update(resetToken).digest("hex")

  return {
    resetToken,
    hash,
    expires: Date.now() + 30 * 60 * 1000, // 30 minutes
  }
}

// Generate email verification token
export const generateVerificationToken = () => {
  const verificationToken = crypto.randomBytes(32).toString("hex")
  const hash = crypto.createHash("sha256").update(verificationToken).digest("hex")

  return {
    verificationToken,
    hash,
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
}
