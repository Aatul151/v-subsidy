import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsAPI, ThemeSettings } from '@/api/settings';

interface ThemeState extends ThemeSettings {
  isLoading: boolean;
  fetchTheme: () => Promise<void>;
  setThemeFromAPI: (theme: ThemeSettings) => void; // Set theme from API response (reusable logic)
  updateTheme: (theme: Partial<ThemeSettings>) => Promise<void>;
  toggleSidebar: () => void; // Toggle sidebar collapsed state
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  mode: 'light',
  sidebarCollapsed: false,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...defaultTheme,
      isLoading: false,

      setThemeFromAPI: (theme: ThemeSettings) => {
        const currentState = get();
        
        // Only update if we got valid theme data from API
        if (theme && theme.primaryColor && theme.secondaryColor && theme.mode) {
          // Check if current state is still default (meaning no persisted custom theme)
          const isCurrentDefault = 
            currentState.primaryColor === defaultTheme.primaryColor &&
            currentState.secondaryColor === defaultTheme.secondaryColor &&
            currentState.mode === defaultTheme.mode;
          
          // Only update if:
          // 1. Current state is default (no custom theme persisted), OR
          // 2. API theme is different from defaults (meaning it's a real saved theme)
          const isApiCustom = 
            theme.primaryColor !== defaultTheme.primaryColor ||
            theme.secondaryColor !== defaultTheme.secondaryColor ||
            theme.mode !== defaultTheme.mode;
          
          if (isCurrentDefault || isApiCustom) {
            // Preserve sidebarCollapsed from current state if API doesn't provide it
            // (sidebarCollapsed is primarily a local UI preference)
            const updatedTheme = {
              ...theme,
              sidebarCollapsed: theme.sidebarCollapsed ?? currentState.sidebarCollapsed,
              isLoading: false,
            };
            set(updatedTheme);
          } else {
            // API returned defaults but we have custom persisted theme - keep persisted
            console.log('API returned default theme, keeping persisted custom theme');
            set({ isLoading: false });
          }
        } else {
          // If API returns invalid data, keep current state (from localStorage)
          console.warn('Invalid theme data from API, keeping current theme');
          set({ isLoading: false });
        }
      },

      fetchTheme: async () => {
        set({ isLoading: true });
        try {
          const theme = await settingsAPI.getTheme();
          get().setThemeFromAPI(theme);
        } catch (error) {
          // If API fails, keep persisted theme (don't reset to default)
          console.error('Failed to fetch theme:', error);
          // Keep current state (which should be from localStorage if persisted)
          set({ isLoading: false });
        }
      },

      updateTheme: async (theme: Partial<ThemeSettings>) => {
        // Get current state before updating
        const currentState = get();
        // Apply theme immediately to local state (will be persisted automatically)
        const newState = { ...currentState, ...theme };
        set(newState);
        
        // Then save to API in background
        set({ isLoading: true });
        try {
          const updatedTheme = await settingsAPI.updateTheme(theme);
          // Merge API response with current state, only updating fields that exist in response
          // This ensures we don't lose any fields if API returns partial data
          const mergedTheme = {
            primaryColor: updatedTheme.primaryColor ?? newState.primaryColor,
            secondaryColor: updatedTheme.secondaryColor ?? newState.secondaryColor,
            mode: updatedTheme.mode ?? newState.mode,
            sidebarCollapsed: updatedTheme.sidebarCollapsed ?? newState.sidebarCollapsed,
          };
          set({ ...mergedTheme, isLoading: false });
        } catch (error) {
          console.error('Failed to update theme:', error);
          // Keep the local state even if API fails (it's already persisted)
          set({ isLoading: false });
        }
      },

      toggleSidebar: () => {
        const currentState = get();
        set({ sidebarCollapsed: !currentState.sidebarCollapsed });
        // Optionally sync to API in background (sidebar state is primarily local preference)
        // We don't await this to keep UI responsive
        settingsAPI.updateTheme({ sidebarCollapsed: !currentState.sidebarCollapsed }).catch((error) => {
          console.error('Failed to sync sidebar state to API:', error);
        });
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        primaryColor: state.primaryColor,
        secondaryColor: state.secondaryColor,
        mode: state.mode,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

