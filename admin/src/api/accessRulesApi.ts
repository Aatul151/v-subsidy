import axiosInstance from './axiosInstance';

export type Role = 'superadmin' | 'admin' | 'user' | 'principal' | 'teacher' | 'accountant' | 'staff' | 'parent' | 'student';

export interface FormAccessRule {
  _id?: string;
  module: string | { _id: string; name: string };
  rolesAllowed: Role[];
  actions: {
    create: Role[];
    read: Role[];
    update: Role[];
    delete: Role[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccessRulePayload {
  module: string; // Module ID or name
  rolesAllowed: Role[];
  actions: {
    create: Role[];
    read: Role[];
    update: Role[];
    delete: Role[];
  };
}

export interface UpdateAccessRulePayload {
  rolesAllowed?: Role[];
  actions?: {
    create?: Role[];
    read?: Role[];
    update?: Role[];
    delete?: Role[];
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const accessRulesAPI = {
  /**
   * Get all access rules
   */
  getAccessRules: async (): Promise<FormAccessRule[]> => {
    const response = await axiosInstance.get<ApiResponse<FormAccessRule[]>>('/form-access-rules');
    return response.data?.data || [];
  },

  /**
   * Get access rule by module (ID or name)
   * @param module - Module ID or name
   */
  getModuleAccessRule: async (module: string): Promise<FormAccessRule> => {
    const response = await axiosInstance.get<ApiResponse<FormAccessRule>>(`/form-access-rules/${module}`);
    return response.data.data;
  },

  /**
   * Create a new access rule
   * @param payload - Access rule data
   */
  createAccessRule: async (payload: CreateAccessRulePayload): Promise<FormAccessRule> => {
    const response = await axiosInstance.post<ApiResponse<FormAccessRule>>('/form-access-rules', payload);
    return response.data.data;
  },

  /**
   * Update access rule for a module (ID or name)
   * @param module - Module ID or name
   * @param payload - Access rule data to update (all fields optional)
   */
  updateModuleAccessRule: async (module: string, payload: UpdateAccessRulePayload): Promise<FormAccessRule> => {
    const response = await axiosInstance.put<ApiResponse<FormAccessRule>>(`/form-access-rules/${module}`, payload);
    return response.data.data;
  },

  /**
   * Delete access rule for a module (ID or name)
   * @param module - Module ID or name
   */
  deleteAccessRule: async (module: string): Promise<void> => {
    await axiosInstance.delete(`/form-access-rules/${module}`);
  },
};

