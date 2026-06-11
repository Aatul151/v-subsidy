import mongoose from 'mongoose';
import { validateModuleName } from '../helpers/validateModuleName.js';
import { SYSTEM_ROLE_NAMES } from '../config/roles.js';

/**
 * FormAccessRules Schema
 * 
 * Defines access control rules for dynamic form modules.
 * Each module has role-based permissions for CRUD operations.
 */
const formAccessRulesSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
    },
    rolesAllowed: {
      type: [String],
      required: [true, 'At least one role must be allowed'],
      validate: {
        validator: function (roles) {
          if (!Array.isArray(roles) || roles.length === 0) {
            return false;
          }
          // Validate all roles are in SYSTEM_ROLE_NAMES
          return roles.every((role) => SYSTEM_ROLE_NAMES.includes(role));
        },
        message: 'All roles must be valid system roles',
      },
    },
    actions: {
      create: {
        type: [String],
        default: [],
        validate: {
          validator: function (roles) {
            if (!Array.isArray(roles)) return false;
            return roles.every((role) => SYSTEM_ROLE_NAMES.includes(role));
          },
          message: 'All create roles must be valid system roles',
        },
      },
      read: {
        type: [String],
        default: [],
        validate: {
          validator: function (roles) {
            if (!Array.isArray(roles)) return false;
            return roles.every((role) => SYSTEM_ROLE_NAMES.includes(role));
          },
          message: 'All read roles must be valid system roles',
        },
      },
      update: {
        type: [String],
        default: [],
        validate: {
          validator: function (roles) {
            if (!Array.isArray(roles)) return false;
            return roles.every((role) => SYSTEM_ROLE_NAMES.includes(role));
          },
          message: 'All update roles must be valid system roles',
        },
      },
      delete: {
        type: [String],
        default: [],
        validate: {
          validator: function (roles) {
            if (!Array.isArray(roles)) return false;
            return roles.every((role) => SYSTEM_ROLE_NAMES.includes(role));
          },
          message: 'All delete roles must be valid system roles',
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on module
formAccessRulesSchema.index({ module: 1 }, { unique: true });

// Pre-save hook: Remove duplicate roles
formAccessRulesSchema.pre('save', function (next) {
  // Remove duplicates from rolesAllowed
  if (this.rolesAllowed) {
    this.rolesAllowed = [...new Set(this.rolesAllowed)];
  }
  
  // Remove duplicates from each action
  if (this.actions) {
    Object.keys(this.actions).forEach((action) => {
      if (Array.isArray(this.actions[action])) {
        this.actions[action] = [...new Set(this.actions[action])];
      }
    });
  }
  
  next();
});

const FormAccessRules = mongoose.model('FormAccessRules', formAccessRulesSchema);

export default FormAccessRules;

