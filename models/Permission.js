import mongoose from "mongoose"

const permissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Permission key is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Permission description is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "user",
        "role",
        "hotel",
        "configuration",
        "room",
        "booking",
        "guest",
        "invoice",
        "payment",
        "frontdesk",
        "housekeeping",
        "maintenance",
        "restaurant",
        "inventory",
        "report",
        "system",
      ],
      default: "system",
    },
    isGlobal: {
      type: Boolean,
      default: false,
      description: "If true, this permission applies across all hotels",
    },
  },
  {
    timestamps: true,
  },
)

const Permission = mongoose.model("Permission", permissionSchema)
export default Permission
