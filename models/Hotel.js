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
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["hotel", "resort", "motel", "inn", "hostel", "apartment", "villa", "cottage", "other"],
      default: "hotel",
    },
    starRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    // Parent-child relationship
    parentHotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    isHeadquarters: {
      type: Boolean,
      default: false,
    },
    // Group/chain identification
    chainCode: {
      type: String,
      trim: true,
    },
    // Company relationship
    parentCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    // Status
    active: {
      type: Boolean,
      default: true,
    },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for branches (child hotels)
hotelSchema.virtual("branches", {
  ref: "Hotel",
  localField: "_id",
  foreignField: "parentHotel",
})

// Method to check if hotel is a branch
hotelSchema.methods.isBranch = function () {
  return this.parentHotel !== null
}

// Method to get all branches recursively
hotelSchema.methods.getAllBranches = async function () {
  const branches = await this.model("Hotel").find({ parentHotel: this._id })

  let allBranches = [...branches]

  // Recursively get branches of branches
  for (const branch of branches) {
    const subBranches = await branch.getAllBranches()
    allBranches = [...allBranches, ...subBranches]
  }

  return allBranches
}

// Method to get the root hotel (headquarters)
hotelSchema.methods.getHeadquarters = async function () {
  if (!this.parentHotel) {
    return this.isHeadquarters ? this : null
  }

  let currentHotel = await this.model("Hotel").findById(this.parentHotel)

  while (currentHotel && currentHotel.parentHotel) {
    currentHotel = await this.model("Hotel").findById(currentHotel.parentHotel)
  }

  return currentHotel && currentHotel.isHeadquarters ? currentHotel : null
}

// Method to get the entire hotel hierarchy
hotelSchema.methods.getHotelHierarchy = async function () {
  // If this is a headquarters or standalone hotel
  if (!this.parentHotel) {
    const branches = await this.getAllBranches()
    return {
      hotel: this,
      branches,
      isStandalone: !this.isHeadquarters && branches.length === 0,
      isHeadquarters: this.isHeadquarters,
    }
  }

  // If this is a branch, get the headquarters
  const headquarters = await this.getHeadquarters()
  if (headquarters) {
    const allBranches = await headquarters.getAllBranches()
    return {
      hotel: headquarters,
      branches: allBranches,
      isStandalone: false,
      isHeadquarters: false,
      currentBranch: this,
    }
  }

  // If no headquarters found (orphaned branch)
  return {
    hotel: this,
    branches: [],
    isStandalone: true,
    isHeadquarters: false,
  }
}

// Create and export the model
const Hotel = mongoose.model("Hotel", hotelSchema)
export default Hotel
