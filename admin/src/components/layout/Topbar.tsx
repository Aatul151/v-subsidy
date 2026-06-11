import {
  Toolbar,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeSettingsIcon from '@mui/icons-material/ColorLens';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ThemeSettingsDrawer } from './ThemeSettingsMenu';

interface TopbarProps {
  onMenuClick: () => void;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Topbar = ({ onMenuClick, sidebarWidth, sidebarCollapsed, onToggleSidebar }: TopbarProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  // Get settings from store (App.tsx handles initialization)
  const { systemSettings } = useSettingsStore();

  // Check if icons should be displayed (default to true if not specified)
  const showThemeSettings = systemSettings.allow_theme_change === true;
  const showNotifications = systemSettings.allow_notification === true;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeDrawerOpen = () => {
    setThemeDrawerOpen(true);
  };

  const handleThemeDrawerClose = () => {
    setThemeDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: { xs: 0, md: sidebarWidth },
        right: 0,
        height: 64,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 1px 3px rgba(0,0,0,0.3)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        transition: theme.transitions.create(['left'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar sx={{ height: 64, px: { xs: 2, sm: 3 }, justifyContent: 'space-between' }}>
        {/* Left Side - Menu Toggle for Desktop */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Menu Icon for Mobile */}
          {isMobile && (
            <IconButton
              edge="start"
              onClick={onMenuClick}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Sidebar Toggle Button for Desktop */}
          {!isMobile && (
            <IconButton
              onClick={onToggleSidebar}
              size="medium"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                },
              }}
            >
              {sidebarCollapsed ? <MenuOpenIcon /> : <MenuOpenIcon sx={{ transform: 'scaleX(-1)' }} />}
            </IconButton>
          )}
        </Box>

        {/* Right Side Icons - Theme Settings, Notification and Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme Settings */}
          {showThemeSettings && (
            <Tooltip title='Theme Settings' placement="bottom" arrow>
              <IconButton
                onClick={handleThemeDrawerOpen}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  },
                }}
              >
                <ThemeSettingsIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Notifications */}
          {showNotifications && (
            <Tooltip title='Notifications' placement="bottom" arrow>
              <IconButton
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  },
                }}
              >
                <Badge
                  badgeContent={systemSettings.notificationBadgeCount ?? 0}
                  color={systemSettings.notificationBadgeColor ?? 'error'}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Profile Avatar */}
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{
              p: 0,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.875rem',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
            }}
          >
            <MenuItem onClick={handleMenuClose}>
              <AccountCircleIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Logout
            </MenuItem>
          </Menu>

          {/* Theme Settings Drawer */}
          <ThemeSettingsDrawer
            open={themeDrawerOpen}
            onClose={handleThemeDrawerClose}
          />
        </Box>
      </Toolbar>
    </Box>
  );
};

