import User from "../models/User.js"
import Hotel from "../models/Hotel.js"
import { ApiError } from "../utils/apiError.js"
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  generateResetToken,
} from "../utils/tokenUtils.js"
import { sendEmail } from "../utils/emailService.js"
import crypto from "crypto"

// Register new user
export const register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, hotelId } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(new ApiError("Email already in use", 400))
    }

    // Create new user
    const user = await User.create({
      full_name,
      email,
      password,
      phone,
    })

    // Generate tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Send response
    res.status(201).json({
      success: true,
      message: "Registration successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Login user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Check if email and password exist
    if (!email || !password) {
      return next(new ApiError("Please provide email and password", 400))
    }

    // Find user by email with password
    const user = await User.findOne({ email }).select("+password")

    // Check if user exists
    if (!user) {
      return next(new ApiError("Invalid credentials", 401))
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      return next(new ApiError("Invalid credentials", 401))
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Logout user
export const logout = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null

    // Blacklist token if it exists
    if (token) {
      blacklistToken(token)
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Refresh token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return next(new ApiError("Refresh token is required", 400))
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)

    // Generate new access token
    const accessToken = generateAccessToken(decoded.id)

    res.status(200).json({
      success: true,
      accessToken,
    })
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError("Refresh token expired", 401))
    }
    next(new ApiError("Invalid refresh token", 401))
  }
}

// Verify Email
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      verification_token: hashedToken,
      verification_expires: { $gt: Date.now() },
    })

    if (!user) {
      return next(new ApiError("Invalid or expired verification token", 400))
    }

    user.is_email_verified = true
    user.verification_token = undefined
    user.verification_expires = undefined
    await user.save({ validateBeforeSave: false })

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return next(new ApiError("There is no user with given email address", 404))
    }

    // Generate reset token
    const resetToken = generateResetToken()

    user.reset_password_token = resetToken.hash
    user.reset_password_expires = resetToken.expires
    await user.save({ validateBeforeSave: false })

    // Send email
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken.resetToken}`

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message: `Please reset your password by clicking on the following link: ${resetUrl}`,
      })

      res.status(200).json({
        success: true,
        message: "Reset password link sent to email",
      })
    } catch (error) {
      user.reset_password_token = undefined
      user.reset_password_expires = undefined
      await user.save({ validateBeforeSave: false })

      return next(new ApiError("There was an error sending the email, try again later", 500))
    }
  } catch (error) {
    next(error)
  }
}

// Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params
    const { password } = req.body

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() },
    }).select("+password")

    if (!user) {
      return next(new ApiError("Invalid or expired reset token", 400))
    }

    user.password = password
    user.reset_password_token = undefined
    user.reset_password_expires = undefined
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Change Password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id).select("+password")

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    // Check if current password is correct
    const isPasswordCorrect = await user.comparePassword(currentPassword)
    if (!isPasswordCorrect) {
      return next(new ApiError("Invalid current password", 401))
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    next(error)
  }
}

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        full_name: req.user.full_name,
        email: req.user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Switch hotel context
export const switchHotelContext = async (req, res, next) => {
  try {
    const { hotelId } = req.body

    // Validate hotel
    const hotel = await Hotel.findById(hotelId)
    if (!hotel) {
      return next(new ApiError("Hotel not found", 404))
    }

    // Check if user has access to this hotel
    if (!req.user.hasHotelAccess(hotelId)) {
      return next(new ApiError("You do not have access to this hotel", 403))
    }

    // Update primary hotel
    req.user.primary_hotel = hotelId
    await req.user.save()

    res.status(200).json({
      success: true,
      message: "Hotel context switched successfully",
    })
  } catch (error) {
    next(error)
  }
}
