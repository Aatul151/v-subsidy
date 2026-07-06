import mongoose from "mongoose";

const CurrentStatusSchema = new mongoose.Schema(
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

    status_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a status"],
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

const CurrentStatus = mongoose.model("Current_Status", CurrentStatusSchema);

export default CurrentStatus;