import {
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';

export const Dashboard = () => {
  // const { user, isSuperAdmin, isAdmin } = useAuthStore(selectUserAndRoles);
  // Fetch users count (first page with limit 1 to get total) - only for admin
  // const { data: usersData, isLoading: usersLoading } = useQuery({
  //   queryKey: ['users', 1, 1],
  //   queryFn: async () => {
  //     return await usersAPI.getAll(1, 1);
  //   },
  //   enabled: isAdmin || isSuperAdmin, // Only fetch users count for admin/superadmin
  // });

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

    </Box>
  );
};

