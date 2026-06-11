import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, useTheme, alpha } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import DashboardIcon from '@mui/icons-material/Dashboard';

export const LoadingScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAuthenticated } = useAuthStore();
  const { fetchTheme } = useThemeStore();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    loadInitialData();
  }, [isAuthenticated, navigate]);


  // Pre-fetch all necessary data for the dashboard
  const loadInitialData = async () => {
    try {
      // First, fetch settings to apply theme before navigating
      await fetchTheme();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate to dashboard after settings are loaded
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Even on error, navigate to dashboard (queries will retry)
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        gap: 4,
        px: 3,
      }}
    >
      {/* Logo/Icon Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <CircularProgress
            size={60}
            thickness={4}
            sx={{
              position: 'absolute',
              color: theme.palette.primary.main,
            }}
          />
          <DashboardIcon
            sx={{
              fontSize: 40,
              color: theme.palette.primary.main,
            }}
          />
        </Box>
      </Box>

      {/* Message Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          mt: 2,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
            maxWidth: 400,
            fontWeight: 500,
          }}
        >
          We're loading your data. This will only take a moment.
        </Typography>
      </Box>
    </Box>
  );
};
