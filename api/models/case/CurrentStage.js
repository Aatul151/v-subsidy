import mongoose from "mongoose";

const CurrentStageSchema = new mongoose.Schema(
  {
    case_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client_Scheme",
      required: [true, "Please select a case"],
    },

    scheme_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a scheme"],
    },

    stage_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a stage"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const CurrentStage = mongoose.model("Current_Stage", CurrentStageSchema);

export default CurrentStage;