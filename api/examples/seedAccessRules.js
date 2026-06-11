/**
 * Seed Data for FormAccessRules
 * 
 * This file contains example seed data for initializing
 * form access rules for common modules.
 * 
 * Usage:
 * 1. Run this script to populate default access rules
 * 2. Or use the API endpoints to create rules manually
 */

import FormAccessRules from '../models/FormAccessRules.js';
import connectDB from '../config/database.js';
import logger from '../config/logger.js';

// Default access rules for common modules
const defaultAccessRules = [
  {
    module: 'student',
    rolesAllowed: ['admin', 'principal', 'teacher'],
    actions: {
      create: ['admin', 'principal', 'teacher'],
      read: ['admin', 'principal', 'teacher', 'parent'],
      update: ['admin', 'principal', 'teacher'],
      delete: ['admin', 'principal'],
    },
  },
  {
    module: 'staff',
    rolesAllowed: ['admin', 'principal'],
    actions: {
      create: ['admin', 'principal'],
      read: ['admin', 'principal', 'teacher'],
      update: ['admin', 'principal'],
      delete: ['admin'],
    },
  },
  {
    module: 'fees',
    rolesAllowed: ['admin', 'accountant', 'principal'],
    actions: {
      create: ['admin', 'accountant'],
      read: ['admin', 'accountant', 'principal', 'parent'],
      update: ['admin', 'accountant'],
      delete: ['admin'],
    },
  },
  {
    module: 'academic',
    rolesAllowed: ['admin', 'principal', 'teacher'],
    actions: {
      create: ['admin', 'principal', 'teacher'],
      read: ['admin', 'principal', 'teacher', 'parent'],
      update: ['admin', 'principal', 'teacher'],
      delete: ['admin', 'principal'],
    },
  },
  {
    module: 'activities',
    rolesAllowed: ['admin', 'principal', 'teacher'],
    actions: {
      create: ['admin', 'principal', 'teacher'],
      read: ['admin', 'principal', 'teacher', 'parent'],
      update: ['admin', 'principal', 'teacher'],
      delete: ['admin', 'principal'],
    },
  },
];

/**
 * Seed access rules into database
 */
export const seedAccessRules = async () => {
  try {
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const rule of defaultAccessRules) {
      try {
        // Check if rule already exists
        const existing = await FormAccessRules.findOne({ module: rule.module });

        if (existing) {
          logger.info(`Access rule for module "${rule.module}" already exists, skipping...`);
          skipped++;
          continue;
        }

        // Create new rule
        await FormAccessRules.create(rule);
        logger.info(`Created access rule for module: ${rule.module}`);
        created++;
      } catch (error) {
        logger.error(`Error creating access rule for module "${rule.module}":`, error);
      }
    }

    logger.info(`Seed completed: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  } catch (error) {
    logger.error('Error seeding access rules:', error);
    throw error;
  }
};

/**
 * Run seed if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAccessRules()
    .then((result) => {
      console.log('Seed completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export default seedAccessRules;

