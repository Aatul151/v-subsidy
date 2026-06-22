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

    expireOn: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    document: [], //upload aaray

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  },
  {
    timestamps: true,
  }
);

const ClientSubsidy = mongoose.model("Client_Subsidy", clientSubsidySchema);

export default ClientSubsidy;