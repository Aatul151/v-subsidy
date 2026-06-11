import axiosInstance from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface User {
  _id?: string;
  name: string;
  email: string;
  role?: string;
  [key: string]: any; // Allow additional fields from dynamic form
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  [key: string]: any; // Dynamic fields based on form definition
}

export interface UpdateUserPayload {
  [key: string]: any; // Dynamic fields based on form definition
}

export interface PaginatedUsersResponse {
  data: User[];
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

export const usersAPI = {
  /**
   * Get all users with pagination
   * @param page - Page number (default: 1)
   * @param limit - Number of items per page (default: 10)
   */
  getAll: async (page: number = 1, limit: number = 10): Promise<PaginatedUsersResponse> => {
    const response = await axiosInstance.get<PaginatedApiResponse<User[]>>('/users', {
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
   * Get user by ID
   * @param userId - User ID
   */
  getById: async (userId: string): Promise<User> => {
    const response = await axiosInstance.get<ApiResponse<User>>(`/users/${userId}`);
    return response.data.data;
  },

  /**
   * Create a new user
   * @param payload - User data
   */
  create: async (payload: CreateUserPayload): Promise<User> => {
    const response = await axiosInstance.post<ApiResponse<User>>('/users', payload);
    return response.data.data;
  },

  /**
   * Update a user
   * @param userId - User ID
   * @param payload - User data to update
   */
  update: async (userId: string, payload: UpdateUserPayload): Promise<User> => {
    const response = await axiosInstance.put<ApiResponse<User>>(`/users/${userId}`, payload);
    return response.data.data;
  },

  /**
   * Delete a user
   * @param userId - User ID
   */
  delete: async (userId: string): Promise<void> => {
    await axiosInstance.delete(`/users/${userId}`);
  },

  /**
   * Change user password
   * @param userId - User ID
   * @param password - New password
   */
  changePassword: async (userId: string, password: string): Promise<void> => {
    await axiosInstance.put(`/users/${userId}/password`, { password });
  },
};

