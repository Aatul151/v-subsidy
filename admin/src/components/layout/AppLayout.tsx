import { useState } from 'react';
import { Box, useTheme, useMediaQuery, alpha } from '@mui/material';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useThemeStore } from '@/store/themeStore';

const DRAWER_WIDTH_EXPANDED = 256;
const DRAWER_WIDTH_COLLAPSED = 80;

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { sidebarCollapsed = false, toggleSidebar } = useThemeStore();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSidebarCollapse = () => {
    toggleSidebar();
  };

  const sidebarWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        collapsed={sidebarCollapsed}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${sidebarWidth}px)` },
          // marginLeft: { xs: 0, md: `${sidebarWidth}px` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Topbar
          onMenuClick={handleSidebarToggle}
          sidebarWidth={sidebarWidth}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleSidebarCollapse}
        />
        <Box
          sx={{
            flexGrow: 1,
            p: isMobile ? 2 : 5,
            mt: isMobile ? '60px' : '40px',
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

