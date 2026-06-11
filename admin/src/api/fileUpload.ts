import axiosInstance from './axiosInstance';

export interface UploadedFile {
  fileName: string;
  originalName?: string; // Original file name before upload
  size: number;
  fileUrl: string;
  mimeType: string;
  uploadedAt: string;
  modifiedAt?: string;
  uniqueId?: string;
}

export interface FileUploadResponse {
  success: boolean;
  data: UploadedFile[];
  message?: string;
}

export const fileUploadAPI = {
  /**
   * Upload files for a form entry
   * @param formName - Form name (required)
   * @param fieldName - Form entry ID (required)
   * @param files - Array of File objects to upload
   * @returns Array of uploaded file metadata
   */
  uploadFiles: async (
    formName: string,
    fieldName: string,
    files: File[]
  ): Promise<UploadedFile[]> => {
    const formData = new FormData();
    formData.append('formName', formName);
    formData.append('fieldName', fieldName);
    
    // Append all files
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axiosInstance.post<FileUploadResponse>('/file-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  /**
   * List all files for a form entry
   * @param formName - Form name (required)
   * @param formRecordId - Form entry ID (required)
   * @returns Array of file metadata
   */
  listFiles: async (formName: string, formRecordId: string): Promise<UploadedFile[]> => {
    const response = await axiosInstance.get<FileUploadResponse>(
      `/file-upload/${formName}/${formRecordId}`
    );
    return response.data.data;
  },

  /**
   * Delete a file from a form entry
   * @param formName - Form name (required)
   * @param formRecordId - Form entry ID (required)
   * @param fileName - File name to delete (required)
   */
  deleteFile: async (formName: string, formRecordId: string, fileName: string): Promise<void> => {
    await axiosInstance.delete(`/file-upload/${formName}/${formRecordId}/${fileName}`);
  },
};

