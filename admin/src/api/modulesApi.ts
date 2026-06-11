import axiosInstance from './axiosInstance';

export interface Module {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateModuleData {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateModuleData {
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const modulesAPI = {
  /**
   * Get all modules
   */
  getModules: async (): Promise<Module[]> => {
    const response = await axiosInstance.get<ApiResponse<Module[]>>('/modules');
    return response.data?.data || [];
  },

  /**
   * Get module by ID
   * @param moduleId - Module ID
   */
  getModuleById: async (moduleId: string): Promise<Module> => {
    const response = await axiosInstance.get<ApiResponse<Module>>(`/modules/${moduleId}`);
    return response.data.data;
  },

  /**
   * Get module by name
   * @param moduleName - Module name
   */
  getModuleByName: async (moduleName: string): Promise<Module> => {
    const response = await axiosInstance.get<ApiResponse<Module>>(`/modules/name/${moduleName}`);
    return response.data.data;
  },

  /**
   * Create a new module
   * @param moduleData - Module data
   */
  createModule: async (moduleData: CreateModuleData): Promise<Module> => {
    const response = await axiosInstance.post<ApiResponse<Module>>('/modules', moduleData);
    return response.data.data;
  },

  /**
   * Update a module by ID
   * @param moduleId - Module ID
   * @param moduleData - Module data to update (all fields optional)
   */
  updateModule: async (moduleId: string, moduleData: UpdateModuleData): Promise<Module> => {
    const response = await axiosInstance.put<ApiResponse<Module>>(`/modules/${moduleId}`, moduleData);
    return response.data.data;
  },

  /**
   * Delete a module by ID
   * @param moduleId - Module ID
   */
  deleteModule: async (moduleId: string): Promise<void> => {
    await axiosInstance.delete(`/modules/${moduleId}`);
  },
};

