import mongoose from "mongoose"

const userHotelAccessSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    // Access level for this specific hotel
    accessLevel: {
      type: String,
      enum: ["full", "limited", "read-only"],
      default: "limited",
    },
    // Role for this specific hotel (can override user's default role)
    hotel_role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    // Specific permissions for this hotel (overrides role permissions)
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    // Whether this is the default hotel for the user
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Departments user has access to within this hotel
    departments: [String],
    // Audit fields
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

// Compound index to ensure a user can only have one access record per hotel
userHotelAccessSchema.index({ user: 1, hotel: 1 }, { unique: true })

// Ensure only one default hotel per user
userHotelAccessSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany({ user: this.user, _id: { $ne: this._id } }, { $set: { isDefault: false } })
  }
  next()
})

// Create and export the model
const UserHotelAccess = mongoose.model("UserHotelAccess", userHotelAccessSchema)
export default UserHotelAccess
