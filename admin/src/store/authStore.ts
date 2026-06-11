import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, AuthResponse } from '@/api/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

// Selector that returns user, isAdmin, and isSuperAdmin
export const selectUserAndRoles = (state: AuthState) => ({
  user: state.user,
  isAdmin: state.user?.role === 'admin' || state.user?.role === 'superadmin',
  isSuperAdmin: state.user?.role === 'superadmin',
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response: AuthResponse = await authAPI.login({ email, password });
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
          });
        } catch (error) {
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const response: AuthResponse = await authAPI.register({ name, email, password });
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
          });
        } catch (error) {
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          const response: AuthResponse = await authAPI.me();
          set({
            token,
            isAuthenticated: response.user?.email ? true : false,
            user: response.user,
          });
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

