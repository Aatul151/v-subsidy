import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
  Collapse,
  Popover,
  MenuList,
  MenuItem,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import StorageIcon from '@mui/icons-material/Storage';
import { useAuthStore, selectUserAndRoles } from '@/store/authStore';
import { useFormBuilderStore } from '@/store/formBuilderStore';
import { useQuery } from '@tanstack/react-query';
import { formsAPI, FormSchema } from '@/api/forms';
import { accessRulesAPI } from '@/api/accessRulesApi';
import { modulesAPI, Module } from '@/api/modulesApi';
import { filterFormsByAccess } from '@/utils/formAccess';
import { getAppDynamicIcon } from '@/components/common/AppDynamicIcon';
import { getInitialSubmenuState } from '@/utils/navigationUtils';
import { capitalizeText } from '@/utils/formUtils';

const DRAWER_WIDTH_EXPANDED = 256;
const DRAWER_WIDTH_COLLAPSED = 80;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
}

interface SubMenuItem {
  icon?: React.ReactNode;
  path: string;
  title: string;
}

interface MenuItem {
  icon: React.ReactNode;
  path?: string;
  title: string;
  submenu?: SubMenuItem[];
}

// Static menu items (without Forms - it will be added dynamically)
// Admin menu items
const adminMenuItems: SubMenuItem[] = [
  { icon: <PeopleIcon />, path: '/admin/users', title: 'Users' },
  { icon: <SettingsIcon />, path: '/manage-forms', title: 'Forms' },
];

// System Administration menu items (Super Admin only)
const superAdminMenuItems: SubMenuItem[] = [
  { icon: <BadgeIcon />, path: '/admin/roles', title: 'Roles' },
  { icon: <SettingsIcon />, path: '/admin/modules', title: 'Modules' },
  { icon: <StorageIcon />, path: '/admin/collections', title: 'Collections' },
  { icon: <SecurityIcon />, path: '/admin/access-rules', title: 'Access Rules' },
  { icon: <SettingsIcon />, path: '/admin/settings', title: 'Settings' },
];

export const Sidebar = ({ open, onClose, collapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;
  const { logout } = useAuthStore();
  // Use selectUserAndRoles to get isAdmin that includes superadmin
  const { user, isAdmin, isSuperAdmin } = useAuthStore(selectUserAndRoles);
  const { clearForm } = useFormBuilderStore();
  const userRole = user?.role;
  // Fetch all forms (data is pre-loaded in LoadingScreen, this will use cache or fetch if needed)
  const { data: allForms = [] } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsAPI.getAll(),
  });

  // Fetch all modules (data is pre-loaded in LoadingScreen, this will use cache or fetch if needed)
  const { data: allModules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => modulesAPI.getModules(),
  });

  // Fetch all access rules (data is pre-loaded in LoadingScreen, this will use cache or fetch if needed)
  const { data: accessRules = [] } = useQuery({
    queryKey: ['accessRules'],
    queryFn: () => accessRulesAPI.getAccessRules(),
  });

  // Filter forms based on user role and exclude system forms
  const allowedForms = useMemo(() => {
    const filtered = filterFormsByAccess(allForms, accessRules, userRole);
    // Exclude system forms from sidebar menu
    return filtered.filter((form) => form.formType !== 'system');
  }, [allForms, accessRules, userRole]);

  // Helper function to get module ID from form.module
  const getModuleId = (module: Module | string | null | undefined): string | null => {
    if (!module) return null;
    if (typeof module === 'string') return module;
    return module._id || null;
  };

  // Helper function to get module name from form.module or module list
  const getModuleName = (form: FormSchema, modules: Module[]): string => {
    const moduleId = getModuleId(form.module);
    if (!moduleId) return 'Other';
    
    // Try to find module in the modules list
    const module = modules.find((m) => m._id === moduleId || m.name === moduleId);
    if (module) return module.name;
    
    // If module is a string and not found in list, return it as is
    if (typeof form.module === 'string') return form.module;
    
    return 'Other';
  };

  // Group forms by module
  const formsByModule = useMemo(() => {
    const grouped: Record<string, FormSchema[]> = {};
    
    allowedForms.forEach((form) => {
      const moduleName = getModuleName(form, allModules);
      if (!grouped[moduleName]) {
        grouped[moduleName] = [];
      }
      grouped[moduleName].push(form);
    });

    return grouped;
  }, [allowedForms, allModules]);

  // Build module menu items with forms as submenus
  const moduleMenuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];
    
    // Get all module names and sort them (put "Other" at the end)
    const moduleNames = Object.keys(formsByModule).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    moduleNames.forEach((moduleName) => {
      const forms = formsByModule[moduleName];
      if (forms.length === 0) return;

      // Find the module to get its icon
      const module = allModules.find((m) => m.name === moduleName);
      const moduleIcon = module?.icon 
        ? getAppDynamicIcon(module.icon, DescriptionIcon)
        : <DescriptionIcon />;

      const formSubmenus: SubMenuItem[] = forms.map((form) => ({
        icon: getAppDynamicIcon(form.settings?.formIcon, DescriptionIcon),
        path: `/forms/${form.name}`,
        title: form.title,
      }));

      items.push({
        icon: moduleIcon,
        title: capitalizeText(moduleName),
        submenu: formSubmenus,
      });
    });

    return items;
  }, [formsByModule, allModules]);

  // Combine menu items with dynamic module menus
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      { icon: <DashboardIcon />, path: '/dashboard', title: 'Dashboard' },
    ];

    // Add module menu items after Dashboard (each module with its forms as submenu)
    if (moduleMenuItems.length > 0) {
      items.push(...moduleMenuItems);
    }

    // Add Admin menu if user is admin or superadmin
    if (isAdmin) {
      items.push({
        icon: <AdminPanelSettingsIcon />,
        title: 'Admin',
        submenu: adminMenuItems,
      });
    }

    // Add System Administration menu if user is superadmin
    if (isSuperAdmin) {
      items.push({
        icon: <SupervisedUserCircleIcon />,
        title: 'System',
        submenu: superAdminMenuItems,
      });
    }

    return items;
  }, [moduleMenuItems, isAdmin, isSuperAdmin]);

  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>(
    getInitialSubmenuState(location.pathname)
  );
  const [submenuAnchor, setSubmenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  // Auto-open submenu when navigating to a submenu item
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.submenu) {
        const submenuKey = item.title.toLowerCase();
        const hasActiveSubmenuItem = item.submenu.some(
          (subItem) => location.pathname === subItem.path
        );
        if (hasActiveSubmenuItem && !openSubmenus[submenuKey]) {
          setOpenSubmenus((prev) => ({
            ...prev,
            [submenuKey]: true,
          }));
        }
      }
    });
  }, [location.pathname, menuItems, openSubmenus]);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const handleSubmenuToggle = (title: string, event?: React.MouseEvent<HTMLElement>) => {
    if (collapsed && event) {
      // In collapsed mode, show popover
      const key = title.toLowerCase();
      setSubmenuAnchor((prev) => ({
        ...prev,
        [key]: prev[key] ? null : event.currentTarget,
      }));
    } else {
      // In expanded mode, toggle collapse
      setOpenSubmenus((prev) => ({
        ...prev,
        [title.toLowerCase()]: !prev[title.toLowerCase()],
      }));
    }
  };

  const handleSubmenuClose = (title: string) => {
    const key = title.toLowerCase();
    setSubmenuAnchor((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  const handleLogout = () => {
    logout();
    clearForm(); // Clear form storage on logout
    navigate('/login');
    if (isMobile) {
      onClose();
    }
  };

  const isPathSelected = (path: string) => {
    return location.pathname === path;
  };

  const isSubmenuItemSelected = (submenu?: SubMenuItem[]) => {
    if (!submenu) return false;
    return submenu.some((item) => location.pathname === item.path);
  };

  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item) => {
      const hasSubmenu = item.submenu && item.submenu.length > 0;
      const isSelected = item.path ? isPathSelected(item.path) : false;
      const isSubmenuSelected = isSubmenuItemSelected(item.submenu);
      const submenuKey = item.title.toLowerCase();
      const isSubmenuOpen = openSubmenus[submenuKey] || false;

      if (hasSubmenu) {
        // When collapsed, show popover menu on click
        if (collapsed) {
          const submenuKey = item.title.toLowerCase();
          const anchorEl = submenuAnchor[submenuKey];
          return (
            <Fragment key={item.title}>
              <ListItem disablePadding>
                <Tooltip title={item.title} placement="right" arrow>
                  <ListItemButton
                    selected={isSubmenuSelected}
                    onClick={(e) => handleSubmenuToggle(item.title, e)}
                    sx={{
                      minHeight: 36,
                      px: 1.5,
                      py: 0.75,
                      justifyContent: 'center',
                      textTransform: 'capitalize',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        color: theme.palette.primary.main,
                        borderRight: `3px solid ${theme.palette.primary.main}`,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        },
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.primary.main,
                        },
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.04),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        justifyContent: 'center',
                        color: isSubmenuSelected ? theme.palette.primary.main : 'text.secondary',
                        '& svg': {
                          fontSize: '1.25rem',
                        },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              </ListItem>
              <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => handleSubmenuClose(item.title)}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                PaperProps={{
                  sx: {
                    mt: 0.5,
                    minWidth: 200,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: 2,
                  },
                }}
              >
                <MenuList dense>
                  {item.submenu?.map((subItem) => {
                    const isSubItemSelected = isPathSelected(subItem.path);
                    return (
                      <MenuItem
                        key={subItem.path}
                        selected={isSubItemSelected}
                        onClick={() => {
                          handleNavigation(subItem.path);
                          handleSubmenuClose(item.title);
                        }}
                        sx={{
                          minHeight: 36,
                          px: 2,
                          py: 0.75,
                          textTransform: 'capitalize',
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.12),
                            },
                            '& .MuiListItemIcon-root': {
                              color: theme.palette.primary.main,
                            },
                          },
                        }}
                      >
                        {subItem.icon && (
                          <ListItemIcon
                            sx={{
                              minWidth: 32,
                              justifyContent: 'center',
                              color: isSubItemSelected ? theme.palette.primary.main : 'text.secondary',
                              '& svg': {
                                fontSize: '1.1rem',
                              },
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                        )}
                        <ListItemText
                          primary={subItem.title}
                          primaryTypographyProps={{
                            fontSize: '0.8125rem',
                            fontWeight: isSubItemSelected ? 500 : 400,
                          }}
                        />
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Popover>
            </Fragment>
          );
        }

        // Expanded state with submenu
        return (
          <Box key={item.title}>
            <ListItem disablePadding>
              <Tooltip title={collapsed ? item.title : ''} placement="right" arrow>
                <ListItemButton
                  selected={isSubmenuSelected}
                  onClick={() => handleSubmenuToggle(item.title, undefined)}
                  sx={{
                    minHeight: 36,
                    px: 2.5,
                    py: 0.75,
                    textTransform: 'capitalize',
                    justifyContent: 'flex-start',
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      borderRight: `3px solid ${theme.palette.primary.main}`,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.04),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      justifyContent: 'center',
                      color: isSubmenuSelected ? theme.palette.primary.main : 'text.secondary',
                      '& svg': {
                        fontSize: '1.25rem',
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem',
                      fontWeight: isSubmenuSelected ? 500 : 400,
                    }}
                  />
                  {isSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
            <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.submenu?.map((subItem) => {
                  const isSubItemSelected = isPathSelected(subItem.path);
                  return (
                    <ListItem key={subItem.path} disablePadding>
                      <Tooltip title={collapsed ? subItem.title : ''} placement="right" arrow>
                        <ListItemButton
                          selected={isSubItemSelected}
                          onClick={() => handleNavigation(subItem.path)}
                          sx={{
                            minHeight: 36,
                            pl: 5,
                            pr: 2.5,
                            py: 0.75,
                            textTransform: 'capitalize',
                            '&.Mui-selected': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                              color: theme.palette.primary.main,
                              borderRight: `3px solid ${theme.palette.primary.main}`,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                              },
                              '& .MuiListItemIcon-root': {
                                color: theme.palette.primary.main,
                              },
                            },
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.action.hover, 0.04),
                            },
                          }}
                        >
                          {subItem.icon && (
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                justifyContent: 'center',
                                color: isSubItemSelected ? theme.palette.primary.main : 'text.secondary',
                                '& svg': {
                                  fontSize: '1.1rem',
                                },
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={subItem.title}
                            primaryTypographyProps={{
                              fontSize: '0.75rem',
                              fontWeight: isSubItemSelected ? 500 : 400,
                            }}
                          />
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        );
      }

      // Regular menu item (no submenu or collapsed state)
      return (
        <ListItem key={item.path || item.title} disablePadding>
          <Tooltip title={collapsed ? item.title : ''} placement="right" arrow>
            <ListItemButton
              selected={isSelected}
              onClick={() => item.path && handleNavigation(item.path)}
              sx={{
                minHeight: 36,
                px: collapsed ? 1.5 : 2.5,
                py: 0.75,
                textTransform: 'capitalize',
                justifyContent: collapsed ? 'center' : 'flex-start',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.04),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  justifyContent: 'center',
                  color: isSelected ? theme.palette.primary.main : 'text.secondary',
                  '& svg': {
                    fontSize: '1.25rem',
                  },
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      );
    });
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Logo Section */}
      <Toolbar
        sx={{
          minHeight: 56,
          px: collapsed ? 1.5 : 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          alignItems: 'center',
        }}
      >
        {!collapsed && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '1.125rem',
              }}
            >
              Admin Panel
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
          </Box>
        )}
      </Toolbar>

      {/* Navigation Items - All at root level */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 0 }}>
          {renderMenuItems(menuItems)}
        </List>
      </Box>

      {/* Logout Button - Fixed at bottom */}
      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          pt: 0.5,
          pb: 0.5,
        }}
      >
        <List sx={{ px: 0, py: 0 }}>
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Logout' : ''} placement="right" arrow>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  minHeight: 32,
                  px: collapsed ? 1.5 : 2,
                  py: 0.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 32,
                    justifyContent: 'center',
                    color: theme.palette.error.main,
                    '& svg': {
                      fontSize: '1.1rem',
                    },
                  }}
                >
                  <LogoutIcon />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary="Logout"
                    primaryTypographyProps={{
                      fontSize: '0.75rem',
                      fontWeight: 400,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        margin: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.paper',
          borderRadius: 0,
          margin: 0,
          padding: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
};

