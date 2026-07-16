import mongoose from "mongoose";

const CaseStatusProgressSchema = new mongoose.Schema(
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

    submitted_date: {
      type: Date,
      default: null,
    },

    completed_date: {
      type: Date,
      default: null,
    },
    status_order_index: {
      type: Number,
      default: 0,
    },

     is_skipped : {
      type: Boolean,
      default: false,
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

const CaseStatusProgress = mongoose.model("Case_Status_Progress", CaseStatusProgressSchema);

export default CaseStatusProgress;