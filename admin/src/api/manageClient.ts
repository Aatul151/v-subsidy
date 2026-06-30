import axiosInstance from "./axiosInstance";

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface Clients {
    _id?: string;
    name?: string;
    [key: string]: any; // Allow additional fields from dynamic form
    createdAt?: string;
    updatedAt?: string;
}

export interface PaginatedClientResponse {
    data: Clients[];
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

export interface CreateClientsPayload {
    [key: string]: any; // Dynamic fields based on form definition
}

export interface UpdateRolePayload {
    [key: string]: any; // Dynamic fields based on form definition
}

export const clientsAPI = {
    /**
     * Get all clients with pagination
     * @param page - Page number (default: 1)
     * @param limit - Number of items per page (default: 10)
     */
    getAll: async (page: number = 1, limit: number = 10): Promise<PaginatedClientResponse> => {
        const response = await axiosInstance.get<PaginatedApiResponse<Clients[]>>('/client', {
            params: { page, limit },
        });

        // Handle both paginated and non-paginated responses for backward compatibility
        if (response?.data?.pagination) {
            return {
                data: response?.data?.data || [],
                pagination: response?.data?.pagination,
            };
        }

        // Fallback for non-paginated responses
        return {
            data: response.data?.data || [],
            pagination: {
                currentPage: 1,
                limit: response?.data?.data?.length || 10,
                total: response?.data?.data?.length || 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    },

    /**
     * Get client by ID
     * @param clientId - client ID
     */
    getById: async (clientId: string): Promise<Clients> => {
        const response = await axiosInstance.get<ApiResponse<Clients>>(`/client/${clientId}`);
        return response.data.data;
    },

    /**
     * Create a new Client
     * @param payload - Client data
     */
    create: async (payload: CreateClientsPayload): Promise<Clients> => {
        const response = await axiosInstance.post<ApiResponse<Clients>>('/client', payload);
        return response?.data;
    },

    /**
       * Update a client
       * @param clientId - Client ID
       * @param payload - Client data to update
       */
    update: async (clientId: string, payload: UpdateRolePayload): Promise<Clients> => {
        const response = await axiosInstance.put<ApiResponse<Clients>>(`/client/${clientId}`, payload);
        return response?.data;
    },

    /**
     * Delete a client
     * @param clientId - Client ID
     */
    delete: async (clientId: string): Promise<void> => {
        await axiosInstance.delete(`/client/${clientId}`);
    },

}