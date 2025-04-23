import mongoose from "mongoose"

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    legalName: {
      type: String,
      required: [true, "Legal name is required"],
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
    },
    taxId: {
      type: String,
      required: [true, "Tax ID is required"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    contact: {
      phone: String,
      email: String,
      website: String,
    },
    logo: String,
    active: {
      type: Boolean,
      default: true,
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
const Company = mongoose.model("Company", companySchema)
export default Company
