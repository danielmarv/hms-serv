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

    // User type - determines access level
    user_type: {
      type: String,
      enum: ["super_admin", "admin", "staff", "guest"],
      default: "staff",
    },

    // Chain and Hotel associations
    chain_access: [
      {
        chain_code: {
          type: String,
          required: true,
        },
        is_chain_admin: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Current active context
    active_chain: {
      type: String,
      default: null,
    },
    active_hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },

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

    // Super admin has all permissions
    if (this.user_type === "super_admin") {
      const Permission = mongoose.model("Permission")
      const allPermissions = await Permission.find({}).select("key")
      return allPermissions.map((p) => p.key)
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

// Check if user has access to a specific chain
userSchema.methods.hasChainAccess = function (chainCode) {
  // Super admin has access to all chains
  if (this.user_type === "super_admin") {
    return true
  }

  // Check if user has access to this chain
  return this.chain_access.some((access) => access.chain_code === chainCode)
}

// Check if user is a chain admin for a specific chain
userSchema.methods.isChainAdmin = function (chainCode) {
  // Super admin is admin of all chains
  if (this.user_type === "super_admin") {
    return true
  }

  // Check if user is admin for this chain
  const chainAccess = this.chain_access.find((access) => access.chain_code === chainCode)
  return chainAccess && chainAccess.is_chain_admin
}

// Check if user has access to a specific hotel
userSchema.methods.hasHotelAccess = async function (hotelId) {
  try {
    // Super admin has access to all hotels
    if (this.user_type === "super_admin") {
      return true
    }

    // Get the hotel to check its chain
    const Hotel = mongoose.model("Hotel")
    const hotel = await Hotel.findById(hotelId)

    if (!hotel) {
      return false
    }

    // Check if user has access to the hotel's chain
    if (!this.hasChainAccess(hotel.chainCode)) {
      return false
    }

    // Chain admins have access to all hotels in their chains
    if (this.isChainAdmin(hotel.chainCode)) {
      return true
    }

    // Check user's hotel access
    const UserHotelAccess = mongoose.model("UserHotelAccess")
    const access = await UserHotelAccess.findOne({
      user: this._id,
      hotel: hotelId,
    })

    return !!access
  } catch (error) {
    console.error("Error checking hotel access:", error)
    return false
  }
}

// Get all accessible hotels for the user
userSchema.methods.getAccessibleHotels = async function () {
  try {
    const Hotel = mongoose.model("Hotel")
    const UserHotelAccess = mongoose.model("UserHotelAccess")

    // Super admin can access all hotels
    if (this.user_type === "super_admin") {
      return await Hotel.find({ active: true })
    }

    // For chain admins, get all hotels in their chains
    if (this.chain_access.some((access) => access.is_chain_admin)) {
      const chainCodes = this.chain_access.filter((access) => access.is_chain_admin).map((access) => access.chain_code)

      return await Hotel.find({
        chainCode: { $in: chainCodes },
        active: true,
      })
    }

    // For regular users, get hotels they have explicit access to
    const hotelAccess = await UserHotelAccess.find({ user: this._id })
    const hotelIds = hotelAccess.map((access) => access.hotel)

    return await Hotel.find({
      _id: { $in: hotelIds },
      active: true,
    })
  } catch (error) {
    console.error("Error getting accessible hotels:", error)
    throw new Error("Error getting accessible hotels")
  }
}

// Set active chain and hotel context
userSchema.methods.setActiveContext = async function (chainCode, hotelId) {
  // Verify chain access
  if (!this.hasChainAccess(chainCode)) {
    throw new Error("User does not have access to this chain")
  }

  // Verify hotel access if provided
  if (hotelId) {
    const hasAccess = await this.hasHotelAccess(hotelId)
    if (!hasAccess) {
      throw new Error("User does not have access to this hotel")
    }

    // Verify hotel belongs to the chain
    const Hotel = mongoose.model("Hotel")
    const hotel = await Hotel.findById(hotelId)
    if (!hotel || hotel.chainCode !== chainCode) {
      throw new Error("Hotel does not belong to the specified chain")
    }

    this.active_hotel = hotelId
  } else {
    // If no hotel specified, try to find a default one
    const UserHotelAccess = mongoose.model("UserHotelAccess")
    const Hotel = mongoose.model("Hotel")

    // Find hotels in this chain that the user has access to
    const hotels = await Hotel.find({ chainCode })
    const hotelIds = hotels.map((h) => h._id)

    // Find default hotel access
    const defaultAccess = await UserHotelAccess.findOne({
      user: this._id,
      hotel: { $in: hotelIds },
      isDefault: true,
    })

    // If default found, use it
    if (defaultAccess) {
      this.active_hotel = defaultAccess.hotel
    } else {
      // Otherwise use the first accessible hotel
      const anyAccess = await UserHotelAccess.findOne({
        user: this._id,
        hotel: { $in: hotelIds },
      })

      this.active_hotel = anyAccess ? anyAccess.hotel : null
    }
  }

  this.active_chain = chainCode
  await this.save()

  return {
    chain: this.active_chain,
    hotel: this.active_hotel,
  }
}

// Check if user is a super admin
userSchema.methods.isSuperAdmin = function () {
  return this.user_type === "super_admin"
}

// Check if user is an admin (either super admin or chain admin)
userSchema.methods.isAdmin = function () {
  if (this.user_type === "super_admin") return true

  // Check if user is admin for any chain
  return this.chain_access.some((access) => access.is_chain_admin)
}

const User = mongoose.model("User", userSchema)
export default User
