import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    client_number: {
      type: String,
      required: [true, 'Please add a client unique number'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    company_name: {
      type: String,
      required: [true, 'Please add an company name'],
      trim: true,
    },


    mobile_number: {
      type: String,
      unique: true,
      required: [true, 'Please add an mobile number'],
    },
    email: {
      type: String,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },

    alternate_contact_person_name: {
      type: String,
      trim: true,
    },

    alternate_contact_person_number: {
      type: String,
      trim: true,
    },

    case_todos: [{
      case_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client_Scheme",
        required: [true, "Please select a case"],
      },
      scheme_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Please select a scheme"],
      },
      
      remark: {
        type: String,
        trim: true,
      }
    }],

    gst_number: {
      type: String,
      trim: true
    },
    pan_number: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    },
    isActive: {
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
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

const Client = mongoose.model('Client', clientSchema);

export default Client;

