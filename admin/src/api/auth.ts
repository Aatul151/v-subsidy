import axiosInstance from './axiosInstance';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  me: async (): Promise<AuthResponse> => {
    const response = await axiosInstance.get<AuthResponse>('/users/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear token from localStorage is handled in the store
    localStorage.removeItem('token');
  },
};

