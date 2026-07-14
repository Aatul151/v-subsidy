import { Grid, Avatar, Box, Chip, Divider, Typography, Stack, Card, CardHeader, List, ListItem, ListItemText, IconButton, Tooltip, } from "@mui/material";
import { Business as BusinessIcon, LocationOn as LocationOnIcon, Email as EmailIcon, Phone as PhoneIcon, Receipt as ReceiptIcon, Badge as BadgeIcon, Notes as NotesIcon, WhatsApp as WhatsAppIcon, NotificationsActiveOutlined, LaunchOutlined } from '@mui/icons-material';
import { AppDrawer } from "./AppDrawer";
import { getAvatarColor } from "@/utils/iconMap";
import { useQuery } from "@tanstack/react-query";
import { clientsAPI } from "@/api/manageClient";
import { useMemo } from "react";
import ClientAlertList from "./ClientAlertList";

const ClientDetailDrawer = ({ open, onClose, clientId, width = 1200 }: any) => {

    const { data: clientDetail } = useQuery({
        queryKey: ["client_detail", clientId],
        queryFn: () => clientsAPI.getById(clientId),
        enabled: !!clientId,
        placeholderData: (prev) => prev,
    });

    const { name, company_name, address, email, mobile_number, gst_number, pan_number, remarks } = clientDetail || {};
    const avatarColor = name ? getAvatarColor(name) : "primary";

    const details = useMemo(() => [{
        label: "Company",
        value: company_name,
        icon: <BusinessIcon fontSize="small" />,
    },
    {
        label: "Address",
        value: address,
        icon: <LocationOnIcon fontSize="small" />,
    },
    {
        label: "Email",
        value: email,
        icon: <EmailIcon fontSize="small" />,
    },
    {
        label: "Mobile",
        value: (
            <Box display={"flex"} alignContent={"center"} gap={1}>
                <span>{mobile_number || "-"}</span>
                {mobile_number && (
                    <Tooltip title="Send Message On Whatsapp">
                        <WhatsAppIcon
                            onClick={() => window.open(`https://wa.me/${mobile_number}`, "_blank", "noopener,noreferrer")}
                            sx={{ color: "success.main", cursor: "pointer", fontSize: 20 }}
                        />
                    </Tooltip>
                )}
            </Box>
        ),
        icon: <PhoneIcon fontSize="small" />,
    },
    {
        label: "GST Number",
        value: gst_number,
        icon: <ReceiptIcon fontSize="small" />,
    },
    {
        label: "PAN Number",
        value: pan_number,
        icon: <BadgeIcon fontSize="small" />,
    },
    {
        label: "Remarks",
        value: remarks,
        icon: <NotesIcon fontSize="small" />,
    },
    ], [company_name, address, email, mobile_number, gst_number, pan_number, remarks]);

    return (
        <AppDrawer
            open={open}
            onClose={onClose}
            title="Client Detail"
            anchor="right"
            width={width}
            displayExpandDrawer
        >
            <Card sx={{ p: 4, borderRadius: 1, bgcolor: "background.paper", border: "1px solid rgba(0,0,0,.08)", boxShadow: "0 8px 30px rgba(0,0,0,.06)", overflow: "hidden", position: "relative" }}>
                {/* Top Accent */}
                <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 5, bgcolor: `${avatarColor}.light` }} />

                {/* Header */}
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Avatar sx={{ width: 45, height: 45, bgcolor: `${avatarColor}.light` }}>
                        {clientDetail?.name?.charAt(0)?.toUpperCase()}
                    </Avatar>

                    <Box flex={1}>
                        <Typography fontSize={18} fontWeight={700}>
                            {clientDetail?.name || "Client Details"}
                        </Typography>

                        <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                            <Typography fontSize={13} color="text.secondary">Client Number:</Typography>
                            <Chip size="small" label={clientDetail?.client_number} sx={{ bgcolor: `${avatarColor}.light` }} />
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Details */}
                <Grid container spacing={2.5}>
                    {details?.map(({ label, value, icon }, index) => (
                        <Grid xs={12} sm={6} md={4} key={index}>
                            <Box p={1}>
                                <Box display="flex" alignItems="center">
                                    <Box sx={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: `${avatarColor}.light` }}>
                                        {icon}
                                    </Box>

                                    <Typography fontSize={14} fontWeight={600} color="text.secondary">
                                        {label}
                                    </Typography>
                                </Box>

                                <Typography pl={2} fontSize={14} fontWeight={600} sx={{ wordBreak: "break-word" }}>
                                    {value || "-"}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Card>

            {/* Alerts */}
            {clientDetail?.case_todos?.length && (
                <ClientAlertList alerts={clientDetail?.case_todos} cardView={true} />
            )}
        </AppDrawer>
    );
};

export default ClientDetailDrawer;