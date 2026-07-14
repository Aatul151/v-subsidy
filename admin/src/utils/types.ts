// Common types used across the application

export type FieldType = 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'datepicker' | 'file' | 'ckeditor' | 'toggle' | 'formReference' | 'apiReference';

export interface FieldConfig {
  label: string;
  name: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

