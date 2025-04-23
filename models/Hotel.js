import mongoose from "mongoose"

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Hotel code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 10,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Hotel", "Resort", "Motel", "Inn", "Bed & Breakfast", "Apartment", "Villa", "Hostel", "Other"],
      default: "Hotel",
    },
    starRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    active: {
      type: Boolean,
      default: true,
    },
    parentCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
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

// Create and export the model
const Hotel = mongoose.model("Hotel", hotelSchema)
export default Hotel
