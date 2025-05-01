import mongoose from "mongoose"

const setupWizardSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
    },
    steps: [
      {
        step: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    currentStep: {
      type: Number,
      default: 1,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
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

const SetupWizard = mongoose.model("SetupWizard", setupWizardSchema)
export default SetupWizard
