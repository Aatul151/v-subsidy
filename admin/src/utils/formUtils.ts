import { FormSchema, FormSection } from '@/api/forms';
import dayjs from 'dayjs';

/**
 * System form names - constants for system-defined forms
 * These forms are managed by the system and have special behavior
 */
export const SYSTEM_FORM_NAMES = {
  USER: 'user',
  ROLE: 'roles',
  COLLECTION: 'collections',
  // Add more system form names here as needed
  // EXAMPLE: 'product', 'order', etc.
} as const;

/**
 * Normalize form schema - ensures sections have required fields (id, title)
 * API and internal format both use `title`, so no transformation needed
 * 
 * @param form - Form schema from API
 * @returns Normalized form schema with sections having id and title
 */
export const transformFormSchema = (form: FormSchema | null): FormSchema | null => {
  if (!form) return null;

  // Create a new object to avoid mutating the original
  const transformedForm = { ...form };

  // Ensure sections have id and title
  if (transformedForm.sections && transformedForm.sections.length > 0) {
    transformedForm.sections = transformedForm.sections.map((section: any) => ({
      ...section,
      id: section.id || `section_${Date.now()}_${Math.random()}`,
      title: section.title || 'Untitled Section',
    }));
  }

  return transformedForm;
};

/**
 * Migrate legacy form (with fields array) to sections format
 * 
 * @param form - Form schema (may have legacy fields array)
 * @returns Array of sections
 */
export const migrateFormToSections = (form: FormSchema | null): FormSection[] => {
  if (!form) return [];

  if (form.sections && form.sections.length > 0) {
    // Ensure sections have id and title
    return form.sections.map((section: any) => ({
      id: section.id || `section_${Date.now()}_${Math.random()}`,
      title: section.title || 'Untitled Section',
      description: section.description,
      fields: section.fields || [],
    }));
  }

  // Migrate legacy fields to a default section
  if (form.fields && form.fields.length > 0) {
    return [{
      id: `section_${Date.now()}`,
      title: 'Default Section',
      fields: form.fields,
    }];
  }

  return [];
};


export const capitalizeText = (text: string): string => {
  try {
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch (error) {
    return text;
  }
};

/**
 * Format date/time value for display in view mode
 * 
 * @param value - Date value (ISO string, timestamp, Date object, or any date-like value)
 * @param options - Formatting options
 * @param options.format - Optional custom dayjs format string (e.g., 'DD/MM/YYYY', 'DD-MM-YYYY hh:mm A')
 * @param options.datePickerMode - DatePicker mode ('date' | 'datetime' | 'time') - used to determine default format if format is not provided
 * @param options.emptyValue - Value to return if date is null/undefined/invalid (default: '—')
 * @returns Formatted date string or emptyValue if invalid
 */
export const formatDateTime = (
  value: any,
  options?: {
    format?: string;
    datePickerMode?: 'date' | 'datetime' | 'time';
    emptyValue?: string;
  }
): string => {
  const { format, datePickerMode = 'date', emptyValue = '—' } = options || {};

  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return emptyValue;
  }

  try {
    const date = dayjs(value);

    // Check if date is valid
    if (!date.isValid()) {
      return emptyValue;
    }

    // If custom format is provided, use it
    if (format) {
      return date.format(format);
    }

    // Otherwise, use default format based on datePickerMode
    switch (datePickerMode) {
      case 'datetime':
        return date.format('DD MMM YYYY hh:mm A');
      case 'time':
        return date.format('hh:mm A');
      case 'date':
      default:
        return date.format('DD/MM/YYYY');
    }
  } catch (error) {
    // If parsing fails, return empty value
    return emptyValue;
  }
};
