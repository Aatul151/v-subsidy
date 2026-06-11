import { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  useTheme,
  Paper,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  DynamicForm as DynamicFormIcon,
  Description as DescriptionIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { modulesAPI } from '@/api/modulesApi';
import { formsAPI } from '@/api/forms';
import { usersAPI } from '@/api/users';
import { formEntriesAPI } from '@/api/forms';
import { useAuthStore, selectUserAndRoles } from '@/store/authStore';
import { AppDynamicIcon } from '@/components/common/AppDynamicIcon';
import { formatDateTime } from '@/utils/formUtils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  onClick?: () => void;
  loading?: boolean;
}

const StatCard = ({ title, value, icon, color = 'primary', onClick, loading }: StatCardProps) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
  };

  const cardContent = (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
              borderColor: colorMap[color],
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${colorMap[color]}15`,
              color: colorMap[color],
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 0.25,
                color: 'text.primary',
                lineHeight: 1.2,
                fontSize: '1.5rem',
              }}
            >
              {loading ? <CircularProgress size={20} /> : value.toLocaleString()}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 500,
                fontSize: '0.8rem',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return cardContent;
};

export const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isAdmin } = useAuthStore(selectUserAndRoles);

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: modulesAPI.getModules,
    enabled: isSuperAdmin, // Only fetch modules for superadmin
  });

  // Fetch all forms
  const { data: allForms = [], isLoading: formsLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsAPI.getAll(),
  });

  // Filter forms based on user role - non-admin users see only their own forms
  const myForms = useMemo(() => {
    if (!user?._id) return [];

    // Admin and superadmin can see all forms
    if (isAdmin || isSuperAdmin) {
      return allForms;
    }

    // For non-admin users, filter by createdBy
    return allForms.filter((form: any) => {
      if (form.createdBy) {
        const createdById = typeof form.createdBy === 'string'
          ? form.createdBy
          : form.createdBy._id || form.createdBy.id;
        return createdById === user._id;
      }
      // If no createdBy field, don't show it for non-admin users
      return false;
    });
  }, [allForms, user?._id, isAdmin, isSuperAdmin]);

  // Fetch users count (first page with limit 1 to get total) - only for admin
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 1, 1],
    queryFn: async () => {
      return await usersAPI.getAll(1, 1);
    },
    enabled: isAdmin || isSuperAdmin, // Only fetch users count for admin/superadmin
  });

  // Calculate statistics based on user role
  const stats = useMemo(() => {
    const totalModules = isSuperAdmin ? modules.length : 0;
    const activeModules = isSuperAdmin ? modules.filter((m) => m.isActive).length : 0;
    const totalForms = myForms.length;
    const customForms = myForms.filter((f) => f.formType !== 'system').length;
    const systemForms = myForms.filter((f) => f.formType === 'system').length;
    const totalUsers = (isAdmin || isSuperAdmin) ? (usersData?.pagination?.total || 0) : 0;

    return {
      totalModules,
      activeModules,
      totalForms,
      customForms,
      systemForms,
      totalUsers,
    };
  }, [modules, myForms, usersData, isAdmin, isSuperAdmin]);

  // Fetch form entries count for each form (optimized - just get pagination info)
  const formEntriesQueries = useQuery({
    queryKey: ['formEntriesCounts', myForms.map((f) => f.name).join(',')],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      // Fetch first page with limit 1 for each form to get total count
      const promises = myForms.map(async (form) => {
        try {
          const result = await formEntriesAPI.getAll({
            formName: form.name,
            page: 1,
            limit: 1,
          });
          counts[form.name] = result.pagination?.total || 0;
        } catch (error) {
          console.error(`Error fetching entries for form ${form.name}:`, error);
          counts[form.name] = 0;
        }
      });
      await Promise.all(promises);
      return counts;
    },
    enabled: myForms.length > 0,
  });

  const totalFormEntries = useMemo(() => {
    if (!formEntriesQueries.data) return 0;
    return Object.values(formEntriesQueries.data).reduce((sum, count) => sum + count, 0);
  }, [formEntriesQueries.data]);

  // Get recent forms (last 5) - only for admin
  const recentForms = useMemo(() => {
    if (!isAdmin && !isSuperAdmin) return [];
    return [...allForms]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [allForms, isAdmin, isSuperAdmin]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        title="Dashboard"
        icon="Dashboard"
        fallbackIcon={DashboardIcon}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <Grid container spacing={1.5}>
          {/* First Row: All 7 Count Cards (70%) + Quick Actions (30%) */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch' }}>
              {/* Count Cards - 70% - 3-4 cards per row */}
              <Box sx={{ width: { xs: '100%', md: isAdmin || isSuperAdmin ? '70%' : '100%' }, flex: 1 }}>
                <Grid container spacing={1.5}>
                  {(isAdmin || isSuperAdmin) && (
                    <>
                      {isSuperAdmin && (
                        <Grid item xs={6} sm={4} md={3}>
                          <StatCard
                            title="Modules"
                            value={stats.totalModules}
                            icon={<BuildIcon sx={{ fontSize: '1.25rem' }} />}
                            color="primary"
                            loading={modulesLoading}
                            onClick={() => isSuperAdmin && navigate('/admin/modules')}
                          />
                        </Grid>
                      )}
                      <Grid item xs={6} sm={4} md={3}>
                        <StatCard
                          title="Users"
                          value={stats.totalUsers}
                          icon={<PeopleIcon sx={{ fontSize: '1.25rem' }} />}
                          color="secondary"
                          loading={usersLoading}
                          onClick={() => (isSuperAdmin || user?.role === 'admin') && navigate('/admin/users')}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={6} sm={4} md={3}>
                    <StatCard
                      title="My Forms"
                      value={stats.totalForms}
                      icon={<DynamicFormIcon sx={{ fontSize: '1.25rem' }} />}
                      color="info"
                      loading={formsLoading}
                      onClick={() => navigate('/manage-forms')}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <StatCard
                      title="Form Entries"
                      value={totalFormEntries}
                      icon={<DescriptionIcon sx={{ fontSize: '1.25rem' }} />}
                      color="primary"
                      loading={formEntriesQueries.isLoading}
                    />
                  </Grid>
                  {(isAdmin || isSuperAdmin) && (
                    <>
                      <Grid item xs={6} sm={4} md={3}>
                        <StatCard
                          title="Custom Forms"
                          value={stats.customForms}
                          icon={<DescriptionIcon sx={{ fontSize: '1.25rem' }} />}
                          color="warning"
                          loading={formsLoading}
                          onClick={() => navigate('/manage-forms')}
                        />
                      </Grid>
                      <Grid item xs={6} sm={4} md={3}>
                        <StatCard
                          title="System Forms"
                          value={stats.systemForms}
                          icon={<AssessmentIcon sx={{ fontSize: '1.25rem' }} />}
                          color="error"
                          loading={formsLoading}
                          onClick={() => navigate('/manage-forms')}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>

              {/* Quick Actions - 30% - Only for admin */}
              {(isAdmin || isSuperAdmin) && (
                <Box sx={{ width: { xs: '100%', md: '30%' }, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.85rem' }}>
                    Quick Actions
                  </Typography>
                  <Paper
                    sx={{
                      p: 1,
                      flex: 1,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                  <Grid container spacing={0.75}>
                    <Grid item xs={6}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          border: `1px solid ${theme.palette.divider}`,
                          height: '100%',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                            borderColor: theme.palette.primary.main,
                            backgroundColor: `${theme.palette.primary.main}05`,
                          },
                        }}
                        onClick={() => navigate('/form-builder')}
                      >
                        <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: `${theme.palette.primary.main}15`,
                                color: theme.palette.primary.main,
                              }}
                            >
                              <DynamicFormIcon sx={{ fontSize: '1rem' }} />
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
                              Create Form
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {isSuperAdmin && (
                      <Grid item xs={6}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                              borderColor: theme.palette.primary.main,
                              backgroundColor: `${theme.palette.primary.main}05`,
                            },
                          }}
                          onClick={() => navigate('/admin/modules')}
                        >
                          <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 0.75,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: `${theme.palette.primary.main}15`,
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <BuildIcon sx={{ fontSize: '1rem' }} />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
                                Modules
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {(isSuperAdmin || user?.role === 'admin') && (
                      <Grid item xs={6}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                              borderColor: theme.palette.primary.main,
                              backgroundColor: `${theme.palette.primary.main}05`,
                            },
                          }}
                          onClick={() => navigate('/admin/users')}
                        >
                          <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 0.75,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: `${theme.palette.primary.main}15`,
                                  color: theme.palette.primary.main,
                                }}
                              >
                                <PeopleIcon sx={{ fontSize: '1rem' }} />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
                                Users
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    <Grid item xs={6}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          border: `1px solid ${theme.palette.divider}`,
                          height: '100%',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                            borderColor: theme.palette.primary.main,
                            backgroundColor: `${theme.palette.primary.main}05`,
                          },
                        }}
                        onClick={() => navigate('/manage-forms')}
                      >
                        <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: `${theme.palette.primary.main}15`,
                                color: theme.palette.primary.main,
                              }}
                            >
                              <DescriptionIcon sx={{ fontSize: '1rem' }} />
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
                              All Forms
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Recent Forms - Enhanced UI - Only for admin */}
          {(isAdmin || isSuperAdmin) && (
            <Grid item xs={12}>
            <Paper
              sx={{
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Recent Forms
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: '0.7rem', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                  onClick={() => navigate('/manage-forms')}
                >
                  View All →
                </Typography>
              </Box>
              {recentForms.length > 0 ? (
                <Grid container spacing={1}>
                  {recentForms.map((form) => (
                    <Grid item xs={12} sm={6} md={2.4} key={form._id || form.name}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          border: `1px solid ${theme.palette.divider}`,
                          height: '100%',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px rgba(0,0,0,0.1)`,
                            borderColor: theme.palette.primary.main,
                          },
                        }}
                        onClick={() => navigate(`/forms/${encodeURIComponent(form.name)}`)}
                      >
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: `${theme.palette.primary.main}15`,
                                color: theme.palette.primary.main,
                                flexShrink: 0,
                              }}
                            >
                              <AppDynamicIcon
                                iconName={form.settings?.formIcon}
                                fallbackIcon={DynamicFormIcon}
                                fontSize="small"
                                color="primary"
                              />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  lineHeight: 1.2,
                                  mb: 0.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {form.title}
                              </Typography>
                              <Chip
                                label={form.formType === 'system' ? 'System' : 'Custom'}
                                size="small"
                                color={form.formType === 'system' ? 'error' : 'primary'}
                                variant="outlined"
                                sx={{ height: 16, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.5, py: 0 } }}
                              />
                            </Box>
                          </Box>
                          {form.createdAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                              {formatDateTime(form.createdAt, { datePickerMode: 'datetime' })}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 2,
                    border: `1px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                    No forms created yet
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          )}
        </Grid>
      </PageContent>
    </Box>
  );
};

