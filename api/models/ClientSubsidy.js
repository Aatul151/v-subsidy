import mongoose from "mongoose";

const clientSubsidySchema = new mongoose.Schema(
  {
    case_number: {
      type: String,
      required: [true, 'Please add a unique case number'],
      unique: true,
      trim: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Please select a client"],
    },

    subsidy: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a subsidy"],
    },

    assigned_executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    current_stage: {
      type: mongoose.Schema.Types.ObjectId,
    },

    status: {
      type: String,
      default: null,
    },

    expireOn: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    documents: [], //upload aaray

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedAt: { type: Date, default: Date.now },

    isArchived: {
      type: Boolean,
      default: false,
    },

    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    stageHistory: [
      {
        stageId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        updatedAt: { type: Date, default: Date.now },
        remarks: { type: String, default: "" }
      }
    ]
  },
  {
    timestamps: true,
  }
);

const ClientSubsidy = mongoose.model("Client_Subsidy", clientSubsidySchema);

export default ClientSubsidy;