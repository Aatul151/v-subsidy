import { useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router/AppRouter';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useSettingsStore } from './store/settingsStore';
import { createAppTheme } from './theme/theme';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const { primaryColor, secondaryColor, mode } = useThemeStore();
  const { fetchSettings, isInitialized: settingsInitialized } = useSettingsStore();

  useEffect(() => {
    // Initialize auth first
    const initAuth = async () => {
      await initialize();
    };
    initAuth();
  }, [initialize]);

  useEffect(() => {
    // Fetch settings from API only once - it will also update theme store
    // This syncs with server, but persisted values are already loaded from localStorage
    if (isAuthenticated && !settingsInitialized) {
      fetchSettings().catch((error) => {
        // Silently fail - persisted values will be used
        console.error('Failed to sync settings from server:', error);
      });
    }
  }, [isAuthenticated, fetchSettings, settingsInitialized]);

  // Create theme memoized to update when theme settings change
  const theme = useMemo(
    () =>
      createAppTheme({
        primaryColor,
        secondaryColor,
        mode,
      }),
    [primaryColor, secondaryColor, mode]
  );

  // Update favicon dynamically based on theme color
  useEffect(() => {
    try {
      // Create SVG favicon with theme color
      const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="${primaryColor}"/>
        <circle cx="16" cy="16" r="8" fill="white" opacity="0.9"/>
      </svg>
    `.trim();

      // Convert SVG to data URL
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      // Find existing favicon link or create new one
      let link = document.querySelector("link[id='favicon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      // Store old URL for cleanup
      const oldUrl = link.href;

      // Update favicon
      link.href = url;
      link.type = 'image/svg+xml';

      // Cleanup function
      return () => {
        // Revoke the new URL if component unmounts or theme changes
        URL.revokeObjectURL(url);
        // If old URL was a blob URL, revoke it too
        if (oldUrl && oldUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(oldUrl);
          } catch (e) {
            // Ignore errors if URL was already revoked
          }
        }
      };
    } catch (error) {
    }
  }, [primaryColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

