import mongoose from "mongoose";

const CaseStageProgressSchema = new mongoose.Schema(
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

    //period
    start_date: {
      type: Date,
      default: null,
    },

    end_date: {
      type: Date,
      default: null,
    },

    date: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
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

const CaseStageProgress = mongoose.model("Case_Stage_Progress", CaseStageProgressSchema);

export default CaseStageProgress;