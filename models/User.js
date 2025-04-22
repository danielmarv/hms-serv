import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: String,
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other",
      },
    },
    dob: Date,

    // Role + permissions
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    custom_permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],

    // Extended attributes
    national_id: String,
    address: {
      street: String,
      city: String,
      country: String,
      zip: String,
    },
    department: {
      type: String,
      trim: true,
    },
    job_title: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },

    // Activity
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended"],
        message: "Status must be active, inactive, or suspended",
      },
      default: "active",
    },
    last_login: Date,
    login_attempts: {
      type: Number,
      default: 0,
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },

    // Password reset
    reset_password_token: String,
    reset_password_expires: Date,

    // Email verification
    verification_token: String,
    verification_expires: Date,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next()

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(12)
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error(error)
  }
}

// Get effective permissions
userSchema.methods.getEffectivePermissions = async function () {
  try {
    // Ensure role and permissions are populated
    if (!this.populated("role") || !this.populated("custom_permissions")) {
      await this.populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      }).populate("custom_permissions")
    }

    // Get permissions from role
    const rolePermissions = this.role?.permissions?.map((p) => p.key) || []

    // Get custom permissions
    const customPermissions = this.custom_permissions?.map((p) => p.key) || []

    // Combine and remove duplicates
    return [...new Set([...rolePermissions, ...customPermissions])]
  } catch (error) {
    throw new Error("Error getting effective permissions")
  }
}

// Create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex")

  this.reset_password_token = crypto.createHash("sha256").update(resetToken).digest("hex")
  this.reset_password_expires = Date.now() + 30 * 60 * 1000 // 30 minutes

  return resetToken
}

// Create email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex")

  this.verification_token = crypto.createHash("sha256").update(verificationToken).digest("hex")
  this.verification_expires = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  return verificationToken
}

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.login_attempts += 1

  // If too many attempts, lock the account
  if (this.login_attempts >= 5) {
    this.status = "suspended"
  }

  await this.save()
}

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.login_attempts = 0
  await this.save()
}

const User = mongoose.model("User", userSchema)
export default User
