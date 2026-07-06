import axiosInstance from "./axiosInstance";

export interface ClientSchemeType {
    _id?: string;
    case_number?: string;
    [key: string]: any; // Allow additional fields from dynamic form
    createdAt?: string;
    updatedAt?: string;
    status?: any;
}

export interface PaginatedClientSubsidyResponse {
    data: ClientSchemeType[];
    pagination?: {
        currentPage: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        stageCounts?: any[];
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
        stageCounts?: any[]
    };
    message?: string;
}

export interface CreateClientPayload {
    [key: string]: any; // Dynamic fields based on form definition
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface UpdateClientSchemePayload {
    [key: string]: any; // Dynamic fields based on form definition
}

export interface GetAllParams {
    page?: number;
    limit?: number;
    filters?: any;
}

export const clientSubsidyAPI = {
    /**
     * Get all client with pagination
     * @param page - Page number (default: 1)
     * @param limit - Number of items per page (default: 10)
     * @param params.fields - Optional array of field names to select (e.g., ['_id', 'fieldName'])
     */
    getAll: async ({ page = 1, limit = 10, filters = {} }: GetAllParams): Promise<PaginatedClientSubsidyResponse> => {

        const params: Record<string, any> = { page, limit, };

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params[key] = value;
            }
        });

        const response = await axiosInstance.get<PaginatedApiResponse<ClientSchemeType[]>>('/client-case', {
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
     * Get client scheme by ID
     * @param clientCaseId - client scheme ID
     */
    getById: async (clientCaseId: string): Promise<ClientSchemeType> => {
        const response = await axiosInstance.get<ApiResponse<ClientSchemeType>>(`/client-case/${clientCaseId}`);
        return response.data.data;
    },


    /**
     * Create a new client scheme
     * @param payload - client scheme data
     */
    create: async (payload: CreateClientPayload): Promise<ClientSchemeType> => {
        const response = await axiosInstance.post<ApiResponse<ClientSchemeType>>('/client-case', payload);
        return response.data.data;
    },

    /**
     * Update a client scheme
     * @param clientCaseId - Client scheme ID
     * @param payload - Client scheme data to update
     */
    update: async (clientCaseId: string, payload: UpdateClientSchemePayload): Promise<ClientSchemeType> => {
        const response = await axiosInstance.put<ApiResponse<ClientSchemeType>>(`/client-case/${clientCaseId}`, payload);
        return response.data.data;
    },

    /**
     * Delete a client scheme
     * @param clientCaseId - client scheme ID
     */
    delete: async (clientCaseId: string): Promise<void> => {
        await axiosInstance.delete(`/client-subsidy/${clientCaseId}`);
    },
}