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

    // Hotel associations - Multi-tenant architecture
    primary_hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
    },
    accessible_hotels: [
      {
        hotel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hotel",
        },
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Role",
        },
        access_level: {
          type: String,
          enum: ["read", "write", "admin"],
          default: "read",
        },
      },
    ],
    is_global_admin: {
      type: Boolean,
      default: false,
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
userSchema.methods.getEffectivePermissions = async function (hotelId = null) {
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

    // If user is a global admin (super admin or admin), they have all permissions
    if (this.is_global_admin || (this.role && ["super admin", "admin"].includes(this.role.name))) {
      // Get all permissions from the database
      const Permission = mongoose.model("Permission")
      const allPermissions = await Permission.find({}).select("key")
      return allPermissions.map((p) => p.key)
    }

    // If hotelId is provided, get hotel-specific role
    let rolePermissions = []
    if (hotelId) {
      // Find the specific hotel in accessible_hotels
      const hotelAccess = this.accessible_hotels.find(
        (access) => access.hotel && access.hotel.toString() === hotelId.toString(),
      )

      if (hotelAccess && hotelAccess.role) {
        // Populate the hotel-specific role if not already populated
        if (typeof hotelAccess.role === "string" || hotelAccess.role instanceof mongoose.Types.ObjectId) {
          const Role = mongoose.model("Role")
          const hotelRole = await Role.findById(hotelAccess.role).populate("permissions")
          if (hotelRole) {
            rolePermissions = hotelRole.permissions.map((p) => p.key)
          }
        } else if (hotelAccess.role.permissions) {
          rolePermissions = hotelAccess.role.permissions.map((p) => p.key)
        }
      }
    } else {
      // Use primary role permissions
      rolePermissions = this.role?.permissions?.map((p) => p.key) || []
    }

    // Get custom permissions
    const customPermissions = this.custom_permissions?.map((p) => p.key) || []

    // Combine and remove duplicates
    return [...new Set([...rolePermissions, ...customPermissions])]
  } catch (error) {
    console.error("Error getting effective permissions:", error)
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

// Check if user has access to a specific hotel
userSchema.methods.hasHotelAccess = function (hotelId, requiredAccessLevel = "read") {
  // If user is a global admin, they have access to all hotels
  if (this.is_global_admin || (this.role && ["super admin", "admin"].includes(this.role.name))) {
    return true
  }

  // Check if it's the primary hotel
  if (this.primary_hotel && this.primary_hotel.toString() === hotelId.toString()) {
    return true
  }

  // Check accessible hotels
  const accessLevels = { read: 1, write: 2, admin: 3 }
  const requiredLevel = accessLevels[requiredAccessLevel] || 1

  const hotelAccess = this.accessible_hotels.find(
    (access) => access.hotel && access.hotel.toString() === hotelId.toString(),
  )

  if (!hotelAccess) {
    return false
  }

  const userLevel = accessLevels[hotelAccess.access_level] || 0
  return userLevel >= requiredLevel
}

// Get all accessible hotels for the user
userSchema.methods.getAccessibleHotels = async function (accessLevel = "read") {
  try {
    // If user is a global admin, return all hotels
    if (this.is_global_admin || (this.role && ["super admin", "admin"].includes(this.role.name))) {
      const Hotel = mongoose.model("Hotel")
      return await Hotel.find({ active: true })
    }

    // Ensure accessible_hotels is populated
    if (!this.populated("accessible_hotels.hotel")) {
      await this.populate("accessible_hotels.hotel primary_hotel")
    }

    const accessLevels = { read: 1, write: 2, admin: 3 }
    const requiredLevel = accessLevels[accessLevel] || 1

    // Filter hotels based on access level
    const hotels = []

    // Add primary hotel if it exists
    if (this.primary_hotel) {
      hotels.push(this.primary_hotel)
    }

    // Add hotels from accessible_hotels with sufficient access level
    this.accessible_hotels.forEach((access) => {
      if (access.hotel && accessLevels[access.access_level] >= requiredLevel) {
        // Avoid duplicates
        if (!hotels.some((h) => h._id.toString() === access.hotel._id.toString())) {
          hotels.push(access.hotel)
        }
      }
    })

    return hotels
  } catch (error) {
    console.error("Error getting accessible hotels:", error)
    throw new Error("Error getting accessible hotels")
  }
}

// Get current hotel context
userSchema.methods.getCurrentHotelContext = function () {
  // Return primary hotel by default
  return this.primary_hotel
}

// Set current hotel context
userSchema.methods.setCurrentHotelContext = async function (hotelId) {
  // Verify access to the hotel
  if (!this.hasHotelAccess(hotelId)) {
    throw new Error("User does not have access to this hotel")
  }

  // Update primary hotel
  this.primary_hotel = hotelId
  await this.save()
  return this.primary_hotel
}

// Check if user is a super admin
userSchema.methods.isSuperAdmin = function () {
  return this.is_global_admin || (this.role && this.role.name === "super admin")
}

// Check if user is an admin
userSchema.methods.isAdmin = function () {
  return this.is_global_admin || (this.role && (this.role.name === "super admin" || this.role.name === "admin"))
}

// Check if user has specific permission for a hotel
userSchema.methods.hasPermissionForHotel = async function (permission, hotelId) {
  // If user is a global admin, they have all permissions
  if (this.is_global_admin || (this.role && ["super admin", "admin"].includes(this.role.name))) {
    return true
  }

  // Get effective permissions for the specific hotel
  const permissions = await this.getEffectivePermissions(hotelId)
  return permissions.includes(permission)
}

const User = mongoose.model("User", userSchema)
export default User
