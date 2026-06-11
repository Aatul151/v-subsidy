import axiosInstance from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Role {
  _id?: string;
  name: string;
  [key: string]: any; // Allow additional fields from dynamic form
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRolePayload {
  [key: string]: any; // Dynamic fields based on form definition
}

export interface UpdateRolePayload {
  [key: string]: any; // Dynamic fields based on form definition
}

export interface PaginatedRolesResponse {
  data: Role[];
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

export const rolesAPI = {
  /**
   * Get all roles with pagination
   * @param page - Page number (default: 1)
   * @param limit - Number of items per page (default: 10)
   */
  getAll: async (page: number = 1, limit: number = 10): Promise<PaginatedRolesResponse> => {
    const response = await axiosInstance.get<PaginatedApiResponse<Role[]>>('/roles', {
      params: { page, limit },
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
   * Get role by ID
   * @param roleId - Role ID
   */
  getById: async (roleId: string): Promise<Role> => {
    const response = await axiosInstance.get<ApiResponse<Role>>(`/roles/${roleId}`);
    return response.data.data;
  },

  /**
   * Create a new role
   * @param payload - Role data
   */
  create: async (payload: CreateRolePayload): Promise<Role> => {
    const response = await axiosInstance.post<ApiResponse<Role>>('/roles', payload);
    return response.data.data;
  },

  /**
   * Update a role
   * @param roleId - Role ID
   * @param payload - Role data to update
   */
  update: async (roleId: string, payload: UpdateRolePayload): Promise<Role> => {
    const response = await axiosInstance.put<ApiResponse<Role>>(`/roles/${roleId}`, payload);
    return response.data.data;
  },

  /**
   * Delete a role
   * @param roleId - Role ID
   */
  delete: async (roleId: string): Promise<void> => {
    await axiosInstance.delete(`/roles/${roleId}`);
  },
};

