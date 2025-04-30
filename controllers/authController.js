import User from "../models/User.js"
import { ApiError } from "../utils/apiError.js"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, blacklistToken } from "../utils/tokenUtils.js"
import { sendEmail } from "../utils/emailService.js"
import crypto from "crypto"
// Import the roleUtils at the top of the file
import { assignDefaultRole } from "../utils/roleUtils.js"

// Register new user
export const register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone } = req.body

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

    // Assign default guest role
    await assignDefaultRole(user._id, "guest")

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
          phone: user.phone,
          status: user.status,
          is_email_verified: user.is_email_verified,
          role: user.role
            ? await user.populate("role").then(() => ({
                id: user.role._id,
                name: user.role.name,
                description: user.role.description,
              }))
            : null,
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

    // Populate role and permissions
    await user.populate({
      path: "role",
      populate: {
        path: "permissions",
        model: "Permission",
        select: "key description category isGlobal", // Include all permission fields
      },
    })

    // Populate custom permissions too
    await user.populate({
      path: "custom_permissions",
      select: "key description category isGlobal",
    })

    // Send response with full permission details
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
        status: user.status,
        last_login: user.last_login,
        is_email_verified: user.is_email_verified,
        role: user.role
          ? {
              id: user.role._id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.permissions.map((p) => ({
                id: p._id,
                key: p.key,
                description: p.description,
                category: p.category,
                isGlobal: p.isGlobal,
              })),
            }
          : null,
        custom_permissions:
          user.custom_permissions.map((p) => ({
            id: p._id,
            key: p.key,
            description: p.description,
            category: p.category,
            isGlobal: p.isGlobal,
          })) || [],
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
        message: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}\nIf you didn't request this, please ignore this email.`,
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
    const user = await User.findById(req.user.id)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
          select: "key description category isGlobal",
        },
      })
      .populate({
        path: "custom_permissions",
        select: "key description category isGlobal",
      })

    if (!user) {
      return next(new ApiError("User not found", 404))
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        gender: user.gender,
        dob: user.dob,
        status: user.status,
        last_login: user.last_login,
        is_email_verified: user.is_email_verified,
        national_id: user.national_id,
        address: user.address,
        department: user.department,
        job_title: user.job_title,
        branch: user.branch,
        role: user.role
          ? {
              id: user.role._id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.permissions.map((p) => ({
                id: p._id,
                key: p.key,
                description: p.description,
                category: p.category,
                isGlobal: p.isGlobal,
              })),
            }
          : null,
        custom_permissions:
          user.custom_permissions.map((p) => ({
            id: p._id,
            key: p.key,
            description: p.description,
            category: p.category,
            isGlobal: p.isGlobal,
          })) || [],
      },
    })
  } catch (error) {
    next(error)
  }
}
