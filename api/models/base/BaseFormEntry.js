import mongoose from 'mongoose';

/**
 * Base FormEntry Schema
 * 
 * This schema serves as the base for all dynamic form entry models.
 * It defines the common structure for form entries across all modules.
 * 
 * Fields:
 * - formId: ObjectId reference to the FormDefinition
 * - submittedBy: User who submitted the form entry
 * - payload: The actual form data (flexible object)
 * - createdAt: Auto-generated timestamp
 * - updatedAt: Auto-generated timestamp
 */
const BaseFormEntrySchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FormDefinition',
      required: [true, 'Form ID is required'],
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Payload is required'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Export only the schema, not a model
export default BaseFormEntrySchema;

