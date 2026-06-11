import axiosInstance from './axiosInstance';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  mode: 'light' | 'dark';
  sidebarCollapsed?: boolean;
}

interface SettingsResponse {
  settings: {
    themeSettings: ThemeSettings;
    [key: string]: any; // Allow any other settings fields
  }
}

interface SettingsPayload {
  themeSettings?: Partial<ThemeSettings>;
  [key: string]: any; // Allow any other settings fields
}

export const settingsAPI = {
  /**
   * Get all settings (including theme settings)
   */
  getSettings: async (): Promise<SettingsResponse> => {
    const response = await axiosInstance.get<SettingsResponse>('/settings');
    return response.data;
  },

  /**
   * Get theme settings (for backward compatibility)
   */
  getTheme: async (): Promise<ThemeSettings> => {
    const response = await axiosInstance.get<SettingsResponse>('/settings');
    return response.data.settings.themeSettings || {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      mode: 'light',
    };
  },

  /**
   * Update settings (including theme settings)
   */
  updateSettings: async (payload: SettingsPayload): Promise<SettingsResponse> => {
    const response = await axiosInstance.put<SettingsResponse>('/settings', payload);
    return response.data;
  },

  /**
   * Update theme settings (for backward compatibility)
   */
  updateTheme: async (theme: Partial<ThemeSettings>): Promise<ThemeSettings> => {
    const payload: SettingsPayload = {
      themeSettings: theme,
    };
    const response = await axiosInstance.put<SettingsResponse>('/settings', payload);
    return response.data.settings?.themeSettings;
  },
};

