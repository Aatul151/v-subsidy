import axiosInstance from '@/api/axiosInstance';
import { rolesAPI } from '@/api/roles';
import { usersAPI } from '@/api/users';
import { OptionItem } from '@/api/forms';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Service to fetch data from different API endpoints for apiReference fields
 */
export const apiReferenceService = {
  /**
   * Fetch options from an API endpoint
   * @param endpoint - API endpoint path (e.g., '/roles', '/users')
   * @param labelField - Field name to use as label (e.g., 'name', 'title')
   * @param valueField - Field name to use as value (default: '_id')
   * @returns Array of OptionItem objects
   */
  fetchOptions: async (
    endpoint: string,
    labelField: string,
    valueField: string = '_id'
  ): Promise<OptionItem[]> => {
    try {
      // Handle known API endpoints with their specific methods
      if (endpoint === '/roles' || endpoint === 'roles') {
        const response = await rolesAPI.getAll(1, 1000);
        return response.data.map((item: any) => ({
          label: String(item[labelField] || item.name || item._id || 'Unknown'),
          value: String(item[valueField] || item._id || ''),
        }));
      }

      if (endpoint === '/users' || endpoint === 'users') {
        const response = await usersAPI.getAll(1, 1000);
        return response.data.map((item: any) => ({
          label: String(item[labelField] || item.name || item.email || item._id || 'Unknown'),
          value: String(item[valueField] || item._id || ''),
        }));
      }

      // Generic API call for other endpoints
      const response = await axiosInstance.get<ApiResponse<any[]>>(endpoint, {
        params: { page: 1, limit: 1000 },
      });

      const data = response.data?.data || [];
      return data.map((item: any) => ({
        label: String(item[labelField] || item.name || item.title || item._id || 'Unknown'),
        value: String(item[valueField] || item._id || ''),
      }));
    } catch (error) {
      console.error(`Failed to fetch options from ${endpoint}:`, error);
      return [];
    }
  },

  /**
   * Get available API endpoints (for configuration UI)
   */
  getAvailableEndpoints: (): Array<{ value: string; label: string; referenceModel: string }> => {
    return [
      { value: '/roles', label: 'Roles', referenceModel: 'Role' },
      { value: '/users', label: 'Users', referenceModel: 'User' },
      // Add more endpoints as needed
    ];
  },
};

