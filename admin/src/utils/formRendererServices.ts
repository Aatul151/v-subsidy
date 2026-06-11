import type { FormServices } from '@aatulwork/customform-renderer';
import { formEntriesAPI } from '@/api/forms';
import type { FormEntry } from '@/api/forms';
import { apiReferenceService } from '@/utils/apiReferenceService';
import { fileUploadAPI } from '@/api/fileUpload';
import { CKEditorContentDisplay } from '@/components/common/CKEditorContentDisplay';
import { FileDisplay } from '@/components/common/FileDisplay';

/**
 * Form renderer services wired to app APIs:
 * - formReference: options from form entries (formEntriesAPI)
 * - apiReference: options from API endpoints (apiReferenceService)
 * - fileUpload: media/file uploads (fileUploadAPI)
 * - ckEditorScriptPath: CKEditor script (already in index.html at /lib/ckeditor/ckeditor.js)
 */
export const formRendererServices: FormServices = {
  formReference: {
    fetchOptions: async (formName: string, fieldName: string) => {
      try {
        const fieldsToSelect = ['_id', `payload.${fieldName}`];
        const response = await formEntriesAPI.getAll({
          formName,
          page: 1,
          limit: 1000,
          fields: fieldsToSelect,
        });
        const entries = (response.data || []) as FormEntry[];
        return entries.map((entry) => {
          const labelValue =
            entry.payload?.[fieldName] ??
            (entry as Record<string, unknown>)[fieldName] ??
            `Entry ${entry._id?.substring(0, 8) ?? 'Unknown'}`;
          return {
            label: String(labelValue),
            value: entry._id ?? '',
          };
        });
      } catch (error) {
        console.error(`Failed to fetch form entries for ${formName}:`, error);
        return [];
      }
    },
  },
  apiReference: {
    fetchOptions: async (endpoint: string, labelField: string, valueField = '_id') => {
      return apiReferenceService.fetchOptions(endpoint, labelField, valueField);
    },
  },
  fileUpload: {
    uploadFiles: async (formName: string, fieldName: string, files: File[]) => {
      return fileUploadAPI.uploadFiles(formName, fieldName, files);
    },
  },
  fileBaseUrl: import.meta.env.VITE_FILE_BASE_URL,
  ckEditorLicenseKey: import.meta.env.VITE_CKEDITOR_LICENSE_KEY,
  CKEditorDisplayComponent: CKEditorContentDisplay,
  FileDisplayComponent: FileDisplay,
};
