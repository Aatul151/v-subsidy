import { Box, Grid, Card, Typography, Avatar, Stack, Divider, useTheme, Chip, CardContent, IconButton, Tooltip, ButtonGroup, Button } from "@mui/material";
import {
  PeopleAlt as PeopleAltIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  ErrorOutline as ErrorOutlineIcon,
  FormatListBulleted as FormatListBulletedIcon,
  TrendingDown as TrendingDownIcon,
  SearchOff as SearchOffIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Receipt as ReceiptIcon,
  Badge as BadgeIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashBoardAPI } from "@/api/dashboard";
import { clientSubsidyAPI } from "@/api/clientScheme";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { AppDrawer } from "@/components/common/AppDrawer";
import { useState } from "react";
import { getAvatarColor } from "@/utils/iconMap";
import { clientsAPI } from "@/api/manageClient";
import { useNavigate } from "react-router-dom";
import ClientSchemeDetail from "../client-scheme/ClientSchemeDetail";

dayjs.extend(utc);

type CountItem = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  OnCardClick?: () => void;
};


export const Dashboard = () => {
  const queryClient = useQueryClient();

  const theme = useTheme();
  const [subsidyId, setSubsidyId] = useState<any>(false);
  const [clientId, setClientId] = useState<any>(false);
  const navigate = useNavigate();

  const { data: dashboardCounts } = useQuery({
    queryKey: ['dashboard_count'],
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

  const { data: monthExpireList } = getSubsidyQuery("client_month_list", 1, 100,
    {
      expireFrom: dayjs().startOf("month").format("YYYY-MM-DD"),
      expireTo: dayjs().endOf("month").format("YYYY-MM-DD"),
      status: "active",
      sortBy: "expireOn",
      sortType: "ASC"
    }
  );

  const { data: weekExpireList } = getSubsidyQuery("client_weekexpire_list", 1, 100,
    {
      expireFrom: dayjs().add(1, "day").format("YYYY-MM-DD"), // Tomorrow
      expireTo: dayjs().add(7, "day").format("YYYY-MM-DD"),// Next 7th day
      status: "active",
      sortBy: "expireOn",
      sortType: "ASC",
    }
  );

  const { data: expiredList } = getSubsidyQuery("client_expiredlist", 1, 10,
    {
      expireTo: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      status: "active",
      sortBy: "expireOn",
    }

  );

  const {
    data: clientDetail,
  } = useQuery({
    queryKey: ['client_detail', clientId],
    queryFn: async () => {
      if (!clientId) return;
      return await clientsAPI.getById(clientId);

    },
    placeholderData: (previousData) => previousData,
  });

  const onRefreshList = (key: string) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  }

  const actionButtons = (
    <ButtonGroup
      variant="outlined"
      size={'small'}
      sx={{
        '& .MuiButtonGroup-grouped': {
          minWidth: 'auto',
          padding: '5px 10px',
        },
      }}
    >
      <Tooltip title="Refresh" placement="bottom" arrow>
        <Button
          onClick={() => { queryClient.invalidateQueries({ queryKey: ['dashboard_count'] }) }}
        >
          <RefreshIcon fontSize="small" />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );

  const clientDetails = [
    {
      label: "Company",
      value: clientDetail?.company_name,
      icon: <BusinessIcon fontSize="small" />,
    },
    {
      label: "Address",
      value: clientDetail?.address,
      icon: <LocationOnIcon fontSize="small" />,
    },
    {
      label: "Email",
      value: clientDetail?.email,
      icon: <EmailIcon fontSize="small" />,
    },
    {
      label: "Mobile",
      value: clientDetail?.mobile_number,
      icon: <PhoneIcon fontSize="small" />,
    },
    {
      label: "GST Number",
      value: clientDetail?.gst_number,
      icon: <ReceiptIcon fontSize="small" />,
    },
    {
      label: "PAN Number",
      value: clientDetail?.pan_number,
      icon: <BadgeIcon fontSize="small" />,
    },
    {
      label: "Remarks",
      value: clientDetail?.remarks,
      icon: <NotesIcon fontSize="small" />,
    },
  ]

  const counts: CountItem[] = [
    {
      title: "Total Clients",
      value: dashboardCounts?.data?.totalClients ?? 0,
      icon: <PeopleAltIcon />,
      color: theme.palette.secondary.main,
      OnCardClick: () => { navigate('/client') }
    },
    {
      title: "Total Subsidies",
      value: dashboardCounts?.data?.totalSubsidies ?? 0,
      icon: <FormatListBulletedIcon />,
      color: theme.palette.primary.main,
      OnCardClick: () => { navigate('/client-case') }
    },
    {
      title: "Active Subsidies",
      value: dashboardCounts?.data?.totalActiveSubsidies ?? 0,
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main,
      OnCardClick: () => { navigate('/client-case?status=active') }
    },
    {
      title: "Inactive Subsidies",
      value: dashboardCounts?.data?.totalInactiveSubsidies ?? 0,
      icon: <TrendingDownIcon />,
      color: theme.palette.warning.main,
      OnCardClick: () => { navigate('/client-case?status=inactive') }
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
      OnCardClick: () => { navigate('/client-case?status=completed') }
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
      OnCardClick: () => { navigate('/client-case?expired=true') }
    }
  ];

  const SubsidyListCard = ({ title, data, color, onRefresh = () => { } }: any) => {

    return (<Card sx={{ borderRadius: 1, height: "100%" }} >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography fontWeight={700} fontSize={20}>
            {title}
          </Typography>
          <Box>
            <Tooltip title="Reload Data" arrow>
              <IconButton
                color="primary"
                onClick={onRefresh}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Chip size="small" label={`${data?.length} Items`} color={color} />
          </Box>
        </Stack>

        {data?.length > 0 ? <Box
          sx={{
            maxHeight: 400,
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
                  <Avatar sx={{ width: 35, height: 35, bgcolor: `${getAvatarColor(item?.client?.name)}.light`, }}>
                    {item?.client?.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize={14} noWrap onClick={(e) => { e?.preventDefault(); e?.stopPropagation(); setClientId(item?.client?._id) }} sx={{ cursor: "pointer" }}>
                      {item?.client?.name}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap  >
                      <span style={{ textTransform: "capitalize" }}> {item?.case_number} </span>| {item?.subsidy_ref?.subsidy_name}
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
          actions={actionButtons}
        />
        <Box paddingTop={1} sx={{ height: "70vh", }}
        >
          <Grid container spacing={1}>
            {counts.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={item.title}>
                <Card
                  sx={{
                    borderRadius: 1,
                    transition: ".3s",
                    background: `linear-gradient(135deg,  ${item.color}15,  ${item.color}05)`,
                    "&:hover": { transform: "translateY(-6px)", },
                    cursor: 'pointer',
                    height: "110px"
                  }}
                  onClick={item?.OnCardClick}
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
                title="Expiring This Week"
                data={weekExpireList?.data}
                color="warning"
                onRefresh={() => { onRefreshList("client_weekexpire_list") }}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <SubsidyListCard
                title="Expiring This Month"
                data={monthExpireList?.data}
                color="warning"
                onRefresh={() => { onRefreshList("client_month_list") }}
              />
            </Grid>

            <Grid item xs={12} md={12} lg={4}>
              <SubsidyListCard
                title="Top 10 Expired Subsidies"
                data={expiredList?.data}
                color="error"
                onRefresh={() => { onRefreshList("client_expiredlist") }}

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
        width={1400}
        displayExpandDrawer={true}
      >
        <ClientSchemeDetail id={subsidyId} />
      </AppDrawer>

      {clientId &&
        <AppDrawer
          open={Boolean(clientId)}
          onClose={() => setClientId(null)}
          title={`Client detail`}
          anchor="right"
          width={1400}
          displayExpandDrawer={true}
        >
          <Box sx={{ p: 4, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "rgba(0,0,0,0.08)", boxShadow: "0px 8px 30px rgba(0,0,0,0.06)", overflow: "hidden", position: "relative" }}>
            {/* Top Accent */}
            <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "5px", bgcolor: `${getAvatarColor(clientDetail?.name)}.light` }} />

            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap", }}>
              <Avatar sx={{ width: 45, height: 45, bgcolor: `${getAvatarColor(clientDetail?.name)}.light`, }}>
                {clientDetail?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Box flex={1}>
                <Typography fontSize={18} fontWeight={700} >
                  {clientDetail?.name || "Client Details"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                  <Typography fontSize={13} color="text.secondary"  >
                    Client Number:
                  </Typography>
                  <Chip size="small" label={clientDetail?.client_number} color={'primary'} sx={{ bgcolor: `${getAvatarColor(clientDetail?.name)}.light` }} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />
            {/* Details */}
            <Grid container spacing={2.5}>
              {clientDetails.map((item, index) => (
                <Grid xs={12} sm={6} md={4} key={index}>
                  <Box sx={{ p: 1 }}  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, }}    >
                      <Box sx={{ width: 40, height: 40, borderRadius: 1, color: `${getAvatarColor(clientDetail?.name)}.light`, display: "flex", alignItems: "center", justifyContent: "center", }}>
                        {item.icon}
                      </Box>
                      <Typography fontSize={14} color="text.secondary" fontWeight={600}  >
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography fontWeight={600} fontSize={14} sx={{ wordBreak: "break-word", lineHeight: 1.8, pl: 2 }}  >
                      {item.value || "-"}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </AppDrawer >}
    </>
  );
};

