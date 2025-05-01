import User from "../models/User.js"
import { ApiError } from "../utils/apiError.js"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, blacklistToken } from "../utils/tokenUtils.js"
import { sendEmail } from "../utils/emailService.js"
import crypto from "crypto"

// Register new user (public registration - creates guest account)
export const register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return next(new ApiError("Email already in use", 400))
    }

    // Create new user with guest role
    const user = await User.create({
      full_name,
      email,
      password,
      phone,
      user_type: "guest", // Default to guest for public registration
    })

    // Generate verification token
    const verificationToken = user.createEmailVerificationToken()
    await user.save({ validateBeforeSave: false })

    // Send verification email
    try {
      const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${verificationToken}`

      await sendEmail({
        email: user.email,
        subject: "Email Verification",
        message: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      })

      // Generate tokens
      const accessToken = generateAccessToken(user._id)
      const refreshToken = generateRefreshToken(user._id)

      // Send response
      res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email.",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          full_name: user.full_name,
          email: user.email,
          user_type: user.user_type,
        },
      })
    } catch (error) {
      // If email sending fails, reset verification token
      user.verification_token = undefined
      user.verification_expires = undefined
      await user.save({ validateBeforeSave: false })

      return next(new ApiError("Error sending verification email", 500))
    }
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

    // Check if user is active
    if (user.status !== "active") {
      return next(new ApiError("Your account is inactive or suspended", 403))
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      // Increment login attempts
      await user.incrementLoginAttempts()
      return next(new ApiError("Invalid credentials", 401))
    }

    // Reset login attempts
    await user.resetLoginAttempts()

    // Update last login
    user.last_login = Date.now()
    await user.save({ validateBeforeSave: false })

    // Generate tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Populate role and permissions for response
    await user.populate({
      path: "role",
      populate: {
        path: "permissions",
        model: "Permission",
        select: "key description category isGlobal",
      },
    })

    // Get accessible hotels
    const accessibleHotels = await user.getAccessibleHotels()

    // Get effective permissions
    const effectivePermissions = await user.getEffectivePermissions()

    // Prepare hotel context data
    let hotelContext = null
    if (user.active_hotel) {
      await user.populate("active_hotel")
      hotelContext = {
        id: user.active_hotel._id,
        name: user.active_hotel.name,
        code: user.active_hotel.code,
        chainCode: user.active_hotel.chainCode,
      }
    }

    // Send response with context information
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        user_type: user.user_type,
        status: user.status,
        is_email_verified: user.is_email_verified,
        last_login: user.last_login,
        role: user.role
          ? {
              id: user.role._id,
              name: user.role.name,
              description: user.role.description,
            }
          : null,
        permissions: effectivePermissions,
        active_chain: user.active_chain,
        active_hotel: hotelContext,
        accessible_hotels: accessibleHotels.map((hotel) => ({
          id: hotel._id,
          name: hotel.name,
          code: hotel.code,
          chainCode: hotel.chainCode,
        })),
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

// Verify email
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.params.token

    // Hash token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    // Find user with token
    const user = await User.findOne({
      verification_token: hashedToken,
      verification_expires: { $gt: Date.now() },
    })

    if (!user) {
      return next(new ApiError("Invalid or expired token", 400))
    }

    // Update user
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

// Forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return next(new ApiError("No user found with this email", 404))
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    // Send reset email
    try {
      const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`

      await sendEmail({
        email: user.email,
        subject: "Password Reset",
        message: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}
If you didn't request this, please ignore this email.`,
      })

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
      })
    } catch (error) {
      // If email sending fails, reset token
      user.reset_password_token = undefined
      user.reset_password_expires = undefined
      await user.save({ validateBeforeSave: false })

      return next(new ApiError("Error sending password reset email", 500))
    }
  } catch (error) {
    next(error)
  }
}

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token
    const { password } = req.body

    // Hash token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    // Find user with token
    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() },
    }).select("+password")

    if (!user) {
      return next(new ApiError("Invalid or expired token", 400))
    }

    // Update password
    user.password = password
    user.reset_password_token = undefined
    user.reset_password_expires = undefined
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    })
  } catch (error) {
    next(error)
  }
}

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Get user with password
    const user = await User.findById(req.user.id).select("+password")

    // Check current password
    const isPasswordCorrect = await user.comparePassword(currentPassword)
    if (!isPasswordCorrect) {
      return next(new ApiError("Current password is incorrect", 401))
    }

    // Update password
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
    // Populate role and permissions
    await req.user.populate({
      path: "role",
      populate: {
        path: "permissions",
        model: "Permission",
        select: "key description category isGlobal",
      },
    })

    await req.user.populate({
      path: "custom_permissions",
      select: "key description category isGlobal",
    })

    // Get accessible hotels
    const accessibleHotels = await req.user.getAccessibleHotels()

    // Get effective permissions
    const effectivePermissions = await req.user.getEffectivePermissions()

    // Prepare hotel context data
    let hotelContext = null
    if (req.user.active_hotel) {
      await req.user.populate("active_hotel")
      hotelContext = {
        id: req.user.active_hotel._id,
        name: req.user.active_hotel.name,
        code: req.user.active_hotel.code,
        chainCode: req.user.active_hotel.chainCode,
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        full_name: req.user.full_name,
        email: req.user.email,
        phone: req.user.phone,
        avatar: req.user.avatar,
        user_type: req.user.user_type,
        status: req.user.status,
        is_email_verified: req.user.is_email_verified,
        last_login: req.user.last_login,
        role: req.user.role
          ? {
              id: req.user.role._id,
              name: req.user.role.name,
              description: req.user.role.description,
            }
          : null,
        permissions: effectivePermissions,
        active_chain: req.user.active_chain,
        active_hotel: hotelContext,
        accessible_hotels: accessibleHotels.map((hotel) => ({
          id: hotel._id,
          name: hotel.name,
          code: hotel.code,
          chainCode: hotel.chainCode,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Switch hotel context
export const switchHotelContext = async (req, res, next) => {
  try {
    const { chainCode, hotelId } = req.body

    if (!chainCode) {
      return next(new ApiError("Chain code is required", 400))
    }

    // Set active context
    const context = await req.user.setActiveContext(chainCode, hotelId)

    res.status(200).json({
      success: true,
      message: "Context switched successfully",
      data: {
        active_chain: context.chain,
        active_hotel: context.hotel,
      },
    })
  } catch (error) {
    next(error)
  }
}
