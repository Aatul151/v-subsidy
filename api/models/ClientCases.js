import mongoose from "mongoose";

const clientCasesSchema = new mongoose.Schema(
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

    scheme: [{
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a subsidy"],
    }],

    assigned_executive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

    current_status: [{
      scheme_id: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Scheme"
      },
      stage_id: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Stage"
      },
      status_id: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Status"
      },
      is_active: {
        type: Boolean,
        default: false
      },
      remarks: {
        type: String,
        trim: true,
        default: "",
      },
    }],

    current_stage: [{
      scheme_id: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Scheme"
      },
      stage_id: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "Stage"
      },
      end_date: {
        type: Date,
        default: null,
      },
      remarks: {
        type: String,
        trim: true,
        default: "",
      },
    }],


    documents: [], //upload aaray
    submitted_docs: [],

    loan_sanction_date: { type: Date, default: null },
    first_disbursement_date: { type: Date, default: null },
    first_sale_bill_amount: { type: Number, default: null },
    loan_amount: { type: Number, default: null },
    disbursement_amount: { type: Number, default: null },
    sanction_amount: { type: Number, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedAt: { type: Date, default: Date.now },
    createdaAt: { type: Date, default: Date.now },

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
  },
  {
    timestamps: true,
  }
);

const ClientCases = mongoose.model("Client_Cases", clientCasesSchema);

export default ClientCases;