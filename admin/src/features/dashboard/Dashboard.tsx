import { Box, Grid, Card, Typography, Avatar, Stack, Divider, useTheme, Chip, CardContent, Button, } from "@mui/material";
import {
  PeopleAlt as PeopleAltIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  ErrorOutline as ErrorOutlineIcon,
  FormatListBulleted as FormatListBulletedIcon,
  TrendingDown as TrendingDownIcon,
  Lock as LockIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useQuery } from "@tanstack/react-query";
import { dashBoardAPI } from "@/api/dashboard";
import { clientSubsidyAPI } from "@/api/clientSubsidy";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { AppDrawer } from "@/components/common/AppDrawer";
import ClientSubsidyDetail from "../client-subsidy/ClientSubsidyDetail";
import { useState } from "react";

dayjs.extend(utc);

export const Dashboard = () => {
  const theme = useTheme();
  const [subsidyId, setSubsidyId] = useState<any>(false);

  const { data: dashboardCounts } = useQuery({
    queryKey: ['dashboard-count'],
    queryFn: async () => { return await dashBoardAPI.getCounts() },
    placeholderData: (previousData) => previousData,
  });

  const getSubsidyQuery = (queryKey: string, page: number, limit: number, filters: any) => {
    return useQuery({
      queryKey: [queryKey],
      queryFn: async () =>
        clientSubsidyAPI.getAll({ page, limit, filters }),
      placeholderData: (previousData) => previousData,
    });
  };

  const { data: todayExpireList } = getSubsidyQuery("client_today_list", 1, 100,
    {
      expireFrom: dayjs().startOf("day").format("YYYY-MM-DD"),
      expireTo: dayjs().endOf("day").format("YYYY-MM-DD"),
    }
  );

  const { data: weekExpireList } = getSubsidyQuery("client_weekexpire_list", 1, 100,
    {
      expireFrom: dayjs().startOf("week").add(1, "day").format("YYYY-MM-DD"),
      expireTo: dayjs().startOf("week").add(7, "day").format("YYYY-MM-DD"),
    }
  );

  const { data: expiredList } = getSubsidyQuery("client_expiredlist", 1, 10,
    { expireTo: dayjs().subtract(1, "day").format("YYYY-MM-DD"), }
  );

  const counts = [
    {
      title: "Total Clients",
      value: dashboardCounts?.data?.totalClients ?? 0,
      icon: <PeopleAltIcon />,
      color: theme.palette.secondary.main,
    },
    {
      title: "Total Subsidies",
      value: dashboardCounts?.data?.totalSubsidies ?? 0,
      icon: <FormatListBulletedIcon />,
      color: theme.palette.primary.main,
    },
    {
      title: "Active Subsidies",
      value: dashboardCounts?.data?.totalActiveSubsidies ?? 0,
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main,
    },
    {
      title: "Inactive Subsidies",
      value: dashboardCounts?.data?.totalInactiveSubsidies ?? 0,
      icon: <TrendingDownIcon />,
      color: theme.palette.warning.main,
    },
    // {
    //   title: "Closed Subsidies",
    //   value: dashboardCounts?.data?.totalClosedSubsidies ?? 0,
    //   icon: <LockIcon />,
    //   color: theme.palette.grey[700],
    // },
    {
      title: "Completed Subsidies",
      value: dashboardCounts?.data?.totalCompletedSubsidies ?? 0,
      icon: <CheckCircleIcon />,
      color: theme.palette.info.main,
    },
    // {
    //   title: "Today's Due Subsidy",
    //   value: dashboardCounts?.data?.todayExpirySubsidies ?? 0,
    //   icon: <AccessTimeIcon />,
    //   color: theme.palette.warning.main,
    // },
    {
      title: "Expired Subsidies",
      value: dashboardCounts?.data?.totalExpiredSubsidies ?? 0,
      icon: <ErrorOutlineIcon />,
      color: theme.palette.error.main,
    }
  ];

  const SubsidyListCard = ({ title, data, color, icon }: any) => {
    return (<Card sx={{ borderRadius: 1, height: "100%", boxShadow: "0px 8px 24px rgba(0,0,0,.06)" }} >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography fontWeight={700} fontSize={20}>
            {title}
          </Typography>
          <Chip size="small" label={`${data?.length} Items`} color={color} />
        </Stack>

        {data?.length > 0 ? <Box
          sx={{
            maxHeight: 550,
            overflowY: "auto",
            overflowX: "hidden",
            "&::-webkit-scrollbar": { width: 4, },
            "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 10, },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent", },
          }}
        >
          {data?.map((item: any, index: number) => (
            <Box
              key={index}
              sx={{
                py: 0.5,
                px: 1,
                borderRadius: 1,
                cursor: "pointer",
                transition: ".2s",
                "&:hover": { transform: "translateX(4px)", },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", minWidth: 0, }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1, }}
                  onClick={() => setSubsidyId(item?._id)}>
                  <Avatar sx={{ width: 35, height: 35, bgcolor: `${color}.light`, }}>
                    {icon}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize={14} noWrap >
                      {item?.client?.name}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap  >
                      {item?.subsidy_ref?.subsidy_name}
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  label={dayjs.utc(item?.expireOn).format("DD-MMM-YYYY")}
                  size="small"
                  color={color}
                  variant="outlined"
                />
              </Stack>

              {index !== data?.length - 1 && (<Divider sx={{ mt: 1 }} />)}
            </Box>
          ))}
        </Box> :
          <Box sx={{ marginTop: 20, p: 4, textAlign: "center", }} >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2, color: "text.secondary", }} >
              <SearchOffIcon sx={{ fontSize: 60 }} />
            </Box>
            <Typography fontSize={18} fontWeight={600} gutterBottom>
              No Data Found
            </Typography>
          </Box>}
      </CardContent>
    </Card>
    )
  };

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
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          overflowX: 'hidden',
          overflowY: "auto",
        }}
      >
        <PageHeader
          title="Dashboard"
          icon="Dashboard"
          fallbackIcon={DashboardIcon}
          sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
        />
        <Box paddingTop={1} sx={{ height: "70vh", }}
        >
          <Grid container spacing={1}>
            {counts.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={item.title}>
                <Card
                  sx={{
                    borderRadius: 1,
                    boxShadow: "0px 10px 30px rgba(0,0,0,0.08)",
                    transition: ".3s",
                    background: `linear-gradient(135deg,  ${item.color}15,  ${item.color}05)`,
                    "&:hover": { transform: "translateY(-6px)", },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" >
                      <Box>
                        <Typography color="text.secondary" fontSize={13}  >
                          {item.title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700} mt={1}   >
                          {item.value}
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: item.color, width: 52, height: 52, }}>
                        {item.icon}
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Lists */}
          <Grid container spacing={1} mt={0.5}>

            <Grid item xs={12} md={6} lg={4}>
              <SubsidyListCard
                title="Today's Expire Subsidy"
                data={todayExpireList?.data}
                color="info"
                icon={<AccessTimeIcon fontSize="small" />}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <SubsidyListCard
                title="Expiring This Week"
                data={weekExpireList?.data}
                color="warning"
                icon={<AccessTimeIcon fontSize="small" />}
              />
            </Grid>

            <Grid item xs={12} md={12} lg={4}>
              <SubsidyListCard
                title="Top 10 Expired Subsidies"
                data={expiredList?.data}
                color="error"
                icon={<ErrorOutlineIcon fontSize="small" />}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
      <AppDrawer
        open={Boolean(subsidyId)}
        onClose={() => setSubsidyId(null)}
        title={`Client Subsidy detail`}
        anchor="right"
        width={1000}
        displayExpandDrawer={true}
      >
        <ClientSubsidyDetail id={subsidyId} />
      </AppDrawer>
    </>
  );
};

