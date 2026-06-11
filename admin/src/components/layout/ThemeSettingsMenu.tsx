import { useState, useEffect } from 'react';
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Box,
  Typography,
  useTheme,
  alpha,
  Switch,
  FormGroup,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeStore } from '@/store/themeStore';
import { ThemeSettings } from '@/api/settings';
import { AppDrawer } from '@/components/common/AppDrawer';

interface ThemeSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Predefined themes with colors optimized for both light and dark modes
const PREDEFINED_THEMES: ThemeSettings[] = [
  { primaryColor: '#2196f3', secondaryColor: '#f50057', mode: 'light' }, // Blue/Pink - vibrant for both modes
  { primaryColor: '#4caf50', secondaryColor: '#ff9800', mode: 'light' }, // Green/Orange - bright and visible
  { primaryColor: '#9c27b0', secondaryColor: '#e91e63', mode: 'light' }, // Purple/Pink - good contrast
  { primaryColor: '#00bcd4', secondaryColor: '#3f51b5', mode: 'light' }, // Cyan/Indigo - vibrant
  { primaryColor: '#f44336', secondaryColor: '#ff9800', mode: 'light' }, // Red/Orange - bright
  { primaryColor: '#03a9f4', secondaryColor: '#9c27b0', mode: 'light' }, // Light Blue/Purple - good visibility
  { primaryColor: '#e91e63', secondaryColor: '#ff4081', mode: 'light' }, // Pink/Magenta - vibrant
  { primaryColor: '#00bcd4', secondaryColor: '#00e676', mode: 'light' }, // Cyan/Green - bright
  { primaryColor: '#ff6f00', secondaryColor: '#ffc107', mode: 'light' }, // Orange/Amber - warm and visible
  { primaryColor: '#607d8b', secondaryColor: '#00bcd4', mode: 'light' }, // Blue Grey/Cyan - balanced
  { primaryColor: '#ff5722', secondaryColor: '#ffc107', mode: 'light' }, // Deep Orange/Amber - vibrant
  { primaryColor: '#3f51b5', secondaryColor: '#00bcd4', mode: 'light' }, // Indigo/Cyan - good contrast
];

export const ThemeSettingsDrawer = ({ open, onClose }: ThemeSettingsDrawerProps) => {
  const theme = useTheme();
  const { primaryColor, secondaryColor, mode, sidebarCollapsed, updateTheme, toggleSidebar } = useThemeStore();
  const [localMode, setLocalMode] = useState(mode);

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  const handleModeChange = async (newMode: 'light' | 'dark') => {
    setLocalMode(newMode);
    // Mode applies immediately
    await updateTheme({ mode: newMode });
  };

  const handlePredefinedTheme = async (themeConfig: ThemeSettings) => {
    // Use current mode instead of themeConfig.mode to preserve user's mode selection
    await updateTheme({
      primaryColor: themeConfig.primaryColor,
      secondaryColor: themeConfig.secondaryColor,
      mode: localMode, // Keep the user's current mode selection
    });
  };

  const isPredefinedThemeActive = (themeConfig: ThemeSettings) => {
    // Only check colors, not mode, since predefined themes preserve user's mode selection
    return (
      themeConfig.primaryColor === primaryColor &&
      themeConfig.secondaryColor === secondaryColor
    );
  };

  return (
    <AppDrawer open={open} onClose={onClose} title="Theme Settings" anchor="right" width={320}>
      {/* Predefined Color Themes */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary', fontWeight: 500 }}>
          Theme Colors
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* First Row - 6 themes */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {PREDEFINED_THEMES.slice(0, 6).map((themeConfig, index) => {
              const isActive = isPredefinedThemeActive(themeConfig);
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${themeConfig.primaryColor} 0%, ${themeConfig.secondaryColor} 100%)`,
                    cursor: 'pointer',
                    border: `2px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                    flex: '0 0 40px',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s',
                    },
                  }}
                  onClick={() => handlePredefinedTheme(themeConfig)}
                >
                  {isActive && (
                    <CheckIcon
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: 20,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
          {/* Second Row - 6 themes */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {PREDEFINED_THEMES.slice(6, 12).map((themeConfig, index) => {
              const isActive = isPredefinedThemeActive(themeConfig);
              return (
                <Box
                  key={index + 6}
                  sx={{
                    position: 'relative',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${themeConfig.primaryColor} 0%, ${themeConfig.secondaryColor} 100%)`,
                    cursor: 'pointer',
                    border: `2px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                    flex: '0 0 40px',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s',
                    },
                  }}
                  onClick={() => handlePredefinedTheme(themeConfig)}
                >
                  {isActive && (
                    <CheckIcon
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: 20,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Sidebar Settings */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary', fontWeight: 500 }}>
          Sidebar
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={sidebarCollapsed}
                onChange={() => toggleSidebar()}
                size="small"
              />
            }
            label="Collapse Sidebar"
            sx={{
              m: 0,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
              },
            }}
          />
        </FormGroup>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/*temp. hide Theme Mode */}
      <Box sx={{ mb: 2, display: 'none' }}>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary', fontWeight: 500 }}>
          Mode
        </Typography>
        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={localMode}
            onChange={(e) => handleModeChange(e.target.value as 'light' | 'dark')}
            row
            sx={{ gap: 1 }}
          >
            <FormControlLabel
              value="light"
              control={<Radio size="small" />}
              label="Light"
              sx={{
                flex: 1,
                border: `1px solid ${localMode === 'light' ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                m: 0,
                backgroundColor: localMode === 'light' ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                '&:hover': {
                  backgroundColor: localMode === 'light'
                    ? alpha(theme.palette.primary.main, 0.12)
                    : theme.palette.action.hover,
                },
              }}
            />
            <FormControlLabel
              value="dark"
              control={<Radio size="small" />}
              label="Dark"
              sx={{
                flex: 1,
                border: `1px solid ${localMode === 'dark' ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                m: 0,
                backgroundColor: localMode === 'dark' ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                '&:hover': {
                  backgroundColor: localMode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.12)
                    : theme.palette.action.hover,
                },
              }}
            />
          </RadioGroup>
        </FormControl>
      </Box>
    </AppDrawer>
  );
};

