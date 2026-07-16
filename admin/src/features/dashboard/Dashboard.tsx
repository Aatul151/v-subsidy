import { Box, Grid, Card, Typography, Avatar, Stack, Divider, useTheme, Chip, CardContent, IconButton, Tooltip, ButtonGroup, Button } from "@mui/material";
import {
  PeopleAlt as PeopleAltIcon,
  TaskAlt as TaskAltIcon,
  ErrorOutline as ErrorOutlineIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  NotificationsActive,
  ReportGmailerrorred
} from '@mui/icons-material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/common/PageHeader';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashBoardAPI } from "@/api/dashboard";
import { clientSubsidyAPI } from "@/api/clientScheme";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { AppDrawer } from "@/components/common/AppDrawer";
import React, { useState } from "react";
import { getAvatarColor } from "@/utils/iconMap";
import { clientsAPI } from "@/api/manageClient";
import { useNavigate } from "react-router-dom";
import ClientSchemeDetail from "../client-scheme/ClientSchemeDetail";
import ClientDetailDrawer from "@/components/common/ClientDetailDrawer";
import { formatDateTime } from "@/utils/formUtils";
import ClientAlertList from "@/components/common/ClientAlertList";

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
  const [openTodoModal, setOpenTodoModal] = useState(false);
  const [todoList, setTodoList] = useState<any[]>([]);

  const { data: dashboardCounts } = useQuery({
    queryKey: ['dashboard_count'],
    queryFn: async () => { return await dashBoardAPI.getCounts() },
    placeholderData: (previousData) => previousData,
  });

  const getSubsidyQuery = (queryKey: string, page: number, limit: number, filters?: any) => {
    return useQuery({
      queryKey: [queryKey],
      queryFn: async () => clientSubsidyAPI.getAll({ page, limit, filters }),
      placeholderData: (previousData) => previousData,
    });
  };

  const { data: clientData, } = useQuery({
    queryKey: ['manage_clients'],
    queryFn: () => clientsAPI.getAll(1, 100, {
      client_todos: true,
      fields: "name,case_todos",
    }),
    placeholderData: (previousData) => previousData,
  });

  const { data: monthExpireList } = getSubsidyQuery("client_month_list", 1, 100,
    {
      expireFrom: dayjs().add(8, "day").format("YYYY-MM-DD"),
      expireTo: dayjs().endOf("month").format("YYYY-MM-DD"),
      status: "active",
      sortBy: "expireOn",
      sortType: "ASC"
    }
  );

  const { data: weekExpireList } = getSubsidyQuery("client_weekexpire_list", 1, 100,
    {
      expireFrom: dayjs().format("YYYY-MM-DD"), // today
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



  const counts: CountItem[] = [
    {
      title: "Total Clients",
      value: dashboardCounts?.data?.totalClients ?? 0,
      icon: <PeopleAltIcon />,
      color: theme.palette.secondary.main,
      OnCardClick: () => { navigate('/client') }
    },
    {
      title: "Total Cases",
      value: dashboardCounts?.data?.totalCases ?? 0,
      icon: <FormatListBulletedIcon />,
      color: theme.palette.primary.main,
      OnCardClick: () => { navigate('/client-case') }
    },
    {
      title: "Today's Expire Case",
      value: dashboardCounts?.data?.todayExpiryCase ?? 0,
      icon: <AccessTimeIcon />,
      color: theme.palette.warning.main,
    },
    {
      title: "Total Expired Cases",
      value: dashboardCounts?.data?.totalExpiredCase ?? 0,
      icon: <ErrorOutlineIcon />,
      color: theme.palette.error.main,
      OnCardClick: () => { navigate('/client-case?expired=true') }
    },
    ...(dashboardCounts?.data?.stageCount?.map((status: any) => ({
      title: status?.label,
      value: status?.totalCount ?? 0,
      icon: <TaskAltIcon />,
      color: status?.bgColor || `#bde1f4`,
      OnCardClick: () => { navigate(`/client-case?stage=${status?._id}`) }
    })) ?? [])
  ];

  const handleTodoModal = (todos: any[]) => {
    setTodoList(todos || []);
    setOpenTodoModal(true);
  };

  const SubsidyListCard = ({ title, data, color, onRefresh = () => { }, isTodoList = false, error }: any) => {

    return (<Card sx={{ borderRadius: 1, height: "100%" }} >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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
            {!isTodoList && <Chip size="small" label={`${data?.length} Items`} color={color} />}
          </Box>
        </Stack>

        {data?.length > 0 ?
          <Box
            sx={{
              maxHeight: 400,
              overflowY: "auto",
              overflowX: "hidden",
              "&::-webkit-scrollbar": { width: 4, },
              "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 10, },
              "&::-webkit-scrollbar-track": { bgcolor: "transparent", },
            }}
          >
            {data?.map((item: any, index: number) => (<React.Fragment key={item._id}>
              {isTodoList ? (<>
                {item?.case_todos?.length > 0 && < Box
                  key={item?._id}
                  sx={{
                    py: 0.5,
                    px: 1,
                    borderRadius: 1,
                    transition: ".2s",
                    "&:hover": { transform: "translateX(4px)", },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={(e) => { e?.preventDefault(); e?.stopPropagation(); setClientId(item?._id) }}>
                      <Avatar sx={{ width: 35, height: 35, bgcolor: `${getAvatarColor(item?.client?.name)}.light` }}>
                        {item?.name?.charAt(0)?.toUpperCase()}
                      </Avatar>

                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={600} fontSize={14} noWrap >
                          {item?.name}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          Total alerts : {item?.case_todos?.length || 0}
                        </Typography>
                      </Box>
                    </Stack>

                    <IconButton onClick={() => handleTodoModal(item?.case_todos)} >
                      <NotificationsActive color="warning" />
                    </IconButton>
                  </Stack>

                  {index !== data?.length - 1 && <Divider sx={{ mt: 1 }} />}
                </Box>}
              </>) :
                < Box
                  key={item?._id}
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
                          <span style={{ textTransform: "capitalize" }}> {item?.case_number} </span> <br /> {item?.scheme_ref?.[0]?.scheme_name}
                          {item?.scheme_ref?.length > 1 && (<> (+{item.scheme_ref.length - 1} More)</>)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Chip
                      label={formatDateTime(item?.expireOn)}
                      size="small"
                      color={color}
                      variant="outlined"
                    />
                  </Stack>

                  {index !== data?.length - 1 && (<Divider sx={{ mt: 1 }} />)}
                </Box>}  </React.Fragment>
            ))}
          </Box> :
          <Box sx={{ marginTop: 10, p: 4, textAlign: "center", }} >
            <Box sx={{ display: "flex", justifyContent: "center", color: "text.secondary", }} >
              <ReportGmailerrorred sx={{ fontSize: 20 }} />
            </Box>
            <Typography fontSize={12} fontWeight={500} color="text.secondary">
              {error || "No case found"}
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
                          {item?.title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700} mt={1}   >
                          {item?.value}
                        </Typography>
                      </Box>
                      <IconButton sx={{ bgcolor: item?.color, width: 52, height: 52, color: "white" }}>
                        {item?.icon}
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Lists */}
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6} md={3}>
              <SubsidyListCard
                title="Expiring This Week"
                data={weekExpireList?.data}
                color="warning"
                onRefresh={() => onRefreshList("client_weekexpire_list")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SubsidyListCard
                title="Expiring This Month"
                data={monthExpireList?.data}
                color="warning"
                onRefresh={() => onRefreshList("client_month_list")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SubsidyListCard
                title="Top 10 Expired Case"
                data={expiredList?.data}
                color="error"
                onRefresh={() => onRefreshList("client_expiredlist")}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SubsidyListCard
                title="Client Alerts"
                data={clientData?.data}
                color="error"
                isTodoList={true}
                error="No Alerts found."
                onRefresh={() => onRefreshList("manage_clients")}
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
        <ClientDetailDrawer
          open={Boolean(clientId)}
          onClose={() => setClientId(null)}
          clientId={clientId}
        />
      }

      <ClientAlertList
        openInDialog
        open={openTodoModal}
        onClose={() => setOpenTodoModal(false)}
        alerts={todoList}
      />
    </>
  );
};

