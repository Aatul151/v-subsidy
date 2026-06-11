import axiosInstance from './axiosInstance';
import { Module } from './modulesApi';

export interface OptionItem {
  label: string;
  value: string;
}

export interface FormField {
  type: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'datepicker' | 'file' | 'ckeditor' | 'toggle' | 'color' | 'formReference' | 'apiReference';
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  allowFilter?: boolean; // Allow this field to be used for filtering
  options?: OptionItem[] | string[]; // For select, radio - supports both new format (OptionItem[]) and legacy (string[])
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxFileSize?: number; // Max file size in bytes (for file type)
    allowedFileTypes?: string[]; // Allowed file extensions/types (e.g., ['pdf', 'jpg', 'png']) (for file type)
  };
  // For formReference type - references another form's entries
  referenceFormName?: string; // Name of the form to reference
  referenceFieldName?: string; // Field name from the referenced form to use as label
  // For apiReference type - references external API endpoints/collections
  apiEndpoint?: string; // API endpoint path (e.g., '/roles', '/users')
  referenceModel?: string; // Reference model name (e.g., 'roles', 'users')
  apiLabelField?: string; // Field name from API response to use as label (e.g., 'name', 'title')
  apiValueField?: string; // Field name from API response to use as value (default: '_id')
  // For file type - allow multiple file selection
  allowMultiple?: boolean; // Allow multiple file selection (for file type)
  // For datepicker type: 'date' = only date, 'datetime' = date with time, 'time' = only time
  datePickerMode?: 'date' | 'datetime' | 'time';
  /** @deprecated Use datePickerMode instead */
  displayTime?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormSchema {
  _id?: string;
  id?: string; // Legacy support
  title: string;
  name: string; // Unique identifier, lowercase
  module?: Module | string | null; // Module ID or name
  formType?: 'system' | 'custom'; // Form type: system forms are not shown in sidebar menu
  collectionName?: string; // Database collection name for form entries
  sections: FormSection[];
  fields?: FormField[]; // Legacy support - will be migrated to sections
  settings?: Record<string, any>; // Dynamic settings object for form configuration
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const formsAPI = {
  /**
   * Get all form definitions
   * @param module - Optional filter by module ID or name
   */
  getAll: async (module?: string): Promise<FormSchema[]> => {
    const params = module ? { module } : {};
    const response = await axiosInstance.get<ApiResponse<FormSchema[]>>('/form-definitions', { params });
    return response.data?.data || [];
  },

  /**
   * Get form definition by ID
   * @param id - Form definition ID
   */
  getById: async (id: string): Promise<FormSchema> => {
    const response = await axiosInstance.get<ApiResponse<FormSchema>>(`/form-definitions/${id}`);
    return response.data.data;
  },

  /**
   * Get form definition by name
   * @param name - Form definition name
   */
  getByName: async (name: string): Promise<FormSchema> => {
    const response = await axiosInstance.get<ApiResponse<FormSchema>>(`/form-definitions/name/${name}`);
    return response.data.data;
  },

  /**
   * Get form definitions by module
   * @param module - Module ID or name
   */
  getByModule: async (module: string): Promise<FormSchema[]> => {
    const response = await axiosInstance.get<ApiResponse<FormSchema[]>>(`/form-definitions/module/${module}`);
    return response.data?.data || [];
  },

  /**
   * Create a new form definition
   * @param form - Form definition data
   */
  create: async (form: Omit<FormSchema, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<FormSchema> => {
    const response = await axiosInstance.post<ApiResponse<FormSchema>>('/form-definitions', form);
    return response.data.data;
  },

  /**
   * Update form definition
   * @param id - Form definition ID
   * @param form - Form definition data to update (all fields optional)
   */
  update: async (id: string, form: Partial<FormSchema>): Promise<FormSchema> => {
    const response = await axiosInstance.put<ApiResponse<FormSchema>>(`/form-definitions/${id}`, form);
    return response.data.data;
  },

  /**
   * Delete form definition
   * @param id - Form definition ID
   */
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/form-definitions/${id}`);
  },
};

// Form Entry interfaces and API
export interface FormEntry {
  _id?: string;
  formId?: {
    _id: string;
    title: string;
    name: string;
    module?: string;
  };
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  payload?: {
    [key: string]: any; // Dynamic fields based on form definition
  };
  formName?: string; // Legacy support - for backward compatibility
  [key: string]: any; // Allow additional fields for backward compatibility
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFormEntryPayload {
  formName: string;
  payload: {
    [key: string]: any; // Dynamic fields based on form definition
  };
}

export interface UpdateFormEntryPayload {
  formName?: string;
  payload: {
    [key: string]: any; // Dynamic fields based on form definition
  };
}

export interface GetAllFormEntriesParams {
  formName: string;
  page?: number;
  limit?: number;
  fields?: string[];
  filters?: Record<string, any>; // Filter object with field names as keys and filter values
}

export interface PaginatedFormEntriesResponse {
  data: FormEntry[];
  pagination: {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
}

export const formEntriesAPI = {
  /**
   * Get all form entries for a specific form with pagination
   * @param params - Parameters object
   * @param params.formName - Form name (required)
   * @param params.page - Page number (default: 1)
   * @param params.limit - Number of items per page (default: 10)
   * @param params.fields - Optional array of field names to select (e.g., ['_id', 'fieldName'])
   */
  getAll: async ({ formName, page = 1, limit = 10, fields, filters }: GetAllFormEntriesParams): Promise<PaginatedFormEntriesResponse> => {
    const params: Record<string, any> = { formName, page, limit };
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    if (filters && Object.keys(filters).length > 0) {
      // Send filters as JSON string or as individual query params
      params.filters = JSON.stringify(filters);
    }
    const response = await axiosInstance.get<PaginatedApiResponse<FormEntry[]>>('/form-entries', {
      params,
    });

    // Handle both paginated and non-paginated responses for backward compatibility
    if (response.data.pagination) {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination,
      };
    }

    // Fallback for non-paginated responses
    return {
      data: response.data?.data || [],
      pagination: {
        currentPage: 1,
        limit: response.data?.data?.length || 10,
        total: response.data?.data?.length || 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  /**
   * Get form entry by ID
   * @param entryId - Form entry ID
   * @param formName - Form name (required)
   */
  getById: async (entryId: string, formName: string): Promise<FormEntry> => {
    const response = await axiosInstance.get<ApiResponse<FormEntry>>(`/form-entries/${entryId}`, {
      params: { formName },
    });
    return response.data.data;
  },

  /**
   * Create a new form entry
   * @param payload - Form entry data (must include formName)
   */
  create: async (payload: CreateFormEntryPayload): Promise<FormEntry> => {
    const response = await axiosInstance.post<ApiResponse<FormEntry>>('/form-entries', payload);
    return response.data.data;
  },

  /**
   * Update a form entry
   * @param entryId - Form entry ID
   * @param payload - Form entry data to update
   */
  update: async (entryId: string, payload: UpdateFormEntryPayload): Promise<FormEntry> => {
    const response = await axiosInstance.put<ApiResponse<FormEntry>>(`/form-entries/${entryId}`, payload);
    return response.data.data;
  },

  /**
   * Delete a form entry
   * @param entryId - Form entry ID
   * @param formName - Form name (required)
   */
  delete: async (entryId: string, formName: string): Promise<void> => {
    await axiosInstance.delete(`/form-entries/${entryId}`, {
      params: { formName },
    });
  },

  /**
   * Export form entries to CSV
   * @param formName - Form name (required)
   * @param limit - Maximum number of entries to export (default: 10000, max: 50000)
   * @param filters - Optional filter object
   */
  exportCSV: async (formName: string, limit: number = 100000, filters?: Record<string, any>): Promise<Blob> => {
    const params: Record<string, any> = { formName, limit };
    if (filters && Object.keys(filters).length > 0) {
      params.filters = JSON.stringify(filters);
    }
    const response = await axiosInstance.get('/form-entries/export/csv', {
      params,
      responseType: 'blob', // Important: set response type to blob for file download
    });
    return response.data;
  },

  /**
   * Import form entries from CSV
   * @param formName - Form name (required)
   * @param file - CSV file to import
   * @param options - Optional import options
   */
  importCSV: async (
    formName: string,
    file: File,
    options?: {
      skipErrors?: boolean;
      updateExisting?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{
    total: number;
    imported: number;
    updated: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
  }> => {
    const formData = new FormData();
    formData.append('formName', formName);
    formData.append('file', file);
    
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    // Use the same approach as fileUpload.ts - explicitly set Content-Type
    // Note: Axios should handle FormData automatically, but being explicit for compatibility
    const response = await axiosInstance.post<ApiResponse<{
      total: number;
      imported: number;
      updated: number;
      failed: number;
      errors?: Array<{ row: number; error: string }>;
    }>>('/form-entries/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  },
};

