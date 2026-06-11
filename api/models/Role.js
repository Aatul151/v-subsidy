import mongoose from 'mongoose';

/**
 * Role Schema
 * 
 * Defines roles in the system that can be assigned to users.
 */
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('Role', roleSchema);

export default Role;

