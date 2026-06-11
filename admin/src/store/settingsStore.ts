import { create } from 'zustand';
import { settingsAPI } from '@/api/settings';

interface SystemSettings {
    [key: string]: any; // Allow any other system settings fields
}

interface SettingsState {
    systemSettings: SystemSettings;
    isLoading: boolean;
    isInitialized: boolean;
    fetchPromise: Promise<void> | null;
    fetchSettings: () => Promise<void>;
    updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<void>;
}


export const useSettingsStore = create<SettingsState>()(
    (set, get) => ({
        systemSettings: {},
        isLoading: false,
        isInitialized: false,
        fetchPromise: null,

        fetchSettings: async () => {
            const currentState = get();

            // If already initialized and not loading, return immediately
            if (currentState.isInitialized && !currentState.isLoading) {
                return;
            }

            // If a fetch is already in progress, return the existing promise
            if (currentState.fetchPromise) {
                return currentState.fetchPromise;
            }

            // Create a new fetch promise
            const fetchPromise = (async () => {
                set({ isLoading: true });
                try {
                    const settings = await settingsAPI.getSettings();
                    const systemSettings = settings.settings?.systemSettings || {};

                    // Merge with defaults to ensure all properties exist
                    const mergedSettings = {
                        ...systemSettings,
                    };

                    set({
                        systemSettings: mergedSettings,
                        isLoading: false,
                        isInitialized: true,
                        fetchPromise: null,
                    });

                    // Also update theme store if theme settings are present
                    // Reuse the existing theme store logic to avoid duplication
                    if (settings.settings?.themeSettings) {
                        const { useThemeStore } = await import('@/store/themeStore');
                        const theme = settings.settings.themeSettings;
                        useThemeStore.getState().setThemeFromAPI(theme);
                    }
                } catch (error) {
                    console.error('Failed to fetch settings:', error);
                    // Keep default settings if API fails
                    set({
                        systemSettings: {},
                        isLoading: false,
                        isInitialized: true,
                        fetchPromise: null,
                    });
                }
            })();

            // Store the promise so other calls can wait for it
            set({ fetchPromise });

            return fetchPromise;
        },

        updateSystemSettings: async (settings: Partial<SystemSettings>) => {
            const currentState = get();
            const newSystemSettings = {
                ...currentState.systemSettings,
                ...settings,
            };
            console.log('newSystemSettings', newSystemSettings);
            // Update local state immediately
            set({ systemSettings: newSystemSettings });

            // Then save to API in background
            set({ isLoading: true });
            try {
                await settingsAPI.updateSettings({ systemSettings: newSystemSettings });
                set({ isLoading: false });
            } catch (error) {
                console.error('Failed to update settings:', error);
                // Keep the local state even if API fails
                set({ isLoading: false });
                throw error;
            }
        },
    })
);

