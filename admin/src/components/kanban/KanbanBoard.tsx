import { Theme } from "@emotion/react";
import { Box, Card, Typography, Button, Chip, SxProps, IconButton, Divider, Grid, Avatar } from "@mui/material";
import { useEffect, useState } from "react";
import { Refresh as RefreshIcon, Launch as LaunchIcon, AccessTime as AccessTimeIcon, PostAdd } from '@mui/icons-material';
import dayjs from "dayjs";
import { AppDrawer } from "../common/AppDrawer";
import ClientSchemeDetail from "@/features/client-scheme/ClientSchemeDetail";
import { clientsAPI } from "@/api/manageClient";
import { useQuery } from "@tanstack/react-query";
import {
    Business as BusinessIcon,
    LocationOn as LocationOnIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Receipt as ReceiptIcon,
    Badge as BadgeIcon,
    Notes as NotesIcon,
} from '@mui/icons-material';
import { getAvatarColor } from "@/utils/iconMap";

type KanbanContainerProps = {
    value: string;
    label: string;
    data: any[];
    bgColor?: string;
    width?: string;
    height?: string;
    loading?: boolean;
    pagination: {
        loadedCount: number,
        nextPage: boolean,
        hasNextPage: boolean,
        stageId: any
        totalCount: number
    },
    onShowMore?: (value: any) => void;
    boardIndex: number;
    onDragStart: (item: any, boardIndex: number) => void;
    onDrop: (value: any) => void;
    onRefresh: () => void
};

type KanbanBoardProps = {
    boards: any[];
    onShowMore?: (value: any) => void;
    loading?: boolean;
    onDrop?: (params: { row: any; stage: any; }) => void;
    onRefresh?: (value: any) => void;
    sx?: SxProps<Theme>;
};

export default function KanbanBoard({
    boards: initialBoards,
    onShowMore,
    loading,
    onDrop,
    onRefresh,
    sx
}: KanbanBoardProps) {
    const [boards, setBoards] = useState(initialBoards);
    const [dragItem, setDragItem] = useState<{ item: any; sourceBoard: number; } | null>(null);

    useEffect(() => {
        setBoards(initialBoards);
    }, [initialBoards]);

    const handleDragStart = (item: any, sourceBoard: number) => {
        setDragItem({ item, sourceBoard });
    };

    const handleDrop = (destinationBoard: number) => {
        if (!dragItem) return;
        if (dragItem.sourceBoard === destinationBoard) {
            setDragItem(null);
            return;
        }
        const updatedBoards = [...boards];
        updatedBoards[dragItem.sourceBoard].data = updatedBoards[dragItem.sourceBoard].data.filter((task: any) => task.id !== dragItem.item.id);
        updatedBoards[destinationBoard].data.push(dragItem.item);
        setBoards(updatedBoards);
        setDragItem(null);
        onDrop?.({ row: dragItem.item, stage: updatedBoards[destinationBoard]._id });
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                overflowX: "auto",
                overflowY: "hidden",
                ...sx
            }}
        >
            {boards?.map((board, index) => (
                <KanbanItem
                    key={board.value}
                    {...board}
                    boardIndex={index}
                    loading={loading}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onShowMore={() => onShowMore?.(board)}
                    onRefresh={() => onRefresh?.(board)}
                />
            ))}
        </Box>
    );
}

function KanbanItem({
    label,
    data,
    bgColor = "#fff",
    pagination,
    loading = false,
    onShowMore,
    boardIndex,
    onDragStart,
    onDrop,
    onRefresh
}: KanbanContainerProps) {
    const { hasNextPage, totalCount } = pagination;
    const [subsidyId, setSubsidyId] = useState<any>(false);
    const [clientId, setClientId] = useState<any>(false);

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
    return (
        <>
            <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(boardIndex)}
                sx={{
                    width: "100%",
                    minWidth: "250px",
                    height: "calc(100vh - 30vh)",
                    maxHeight: "calc(100vh - 20vh)",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    bgcolor: bgColor,
                    borderRadius: 1,
                    p: 2,
                    overflow: "hidden",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0px 4px 16px rgba(0,0,0,.06)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                        pb: 1,
                        flexShrink: 0,
                        borderBottom: "1px solid #F1F5F9",
                    }}
                >
                    <Typography sx={{ fontWeight: 700 }} > {label}</Typography>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                        }}>
                        {(data?.length == 0 && totalCount > 0) &&
                            <Button onClick={onRefresh}  >
                                <RefreshIcon fontSize="small" />
                            </Button>}

                        {totalCount && <Chip size="small" label={totalCount} />}
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        pr: 1,
                        "&::-webkit-scrollbar": { width: 6 },
                        "&::-webkit-scrollbar-thumb": { background: "#D1D5DB", borderRadius: 20 },
                    }}
                >
                    {data.map((item) => (
                        <Card
                            key={item.id}
                            draggable
                            onDragStart={() => onDragStart(item, boardIndex)}
                            sx={{
                                p: 1.5,
                                borderRadius: 1,
                                flexShrink: 0,
                                cursor: "move",
                                border: "1px solid #F1F5F9",
                                "&:hover": { boxShadow: "0px 10px 18px rgba(0,0,0,.08)", border: "1px solid black" },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                                    {item?.title}
                                </Typography>
                                <IconButton onClick={() => setSubsidyId(item?.id)}>
                                    <LaunchIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography fontSize={12} color="primary" onClick={(e) => { e?.preventDefault(); e?.stopPropagation(); setClientId(item?.client?._id) }} sx={{ cursor: "pointer" }} >
                                    {item?.person}
                                </Typography>
                                <Typography fontSize={10} color="primary" sx={{ textTransform: "capitalize" }}>
                                    {item?.case_number ?? "-"}
                                </Typography>
                            </Box>

                            <Typography
                                fontSize={12}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    fontWeight: 500,
                                    color: dayjs(item?.expireOn).startOf("day").isBefore(dayjs().startOf("day")) ? "error.main" : "text.secondary",
                                    fontSize: 12
                                }}
                            >
                                <AccessTimeIcon sx={{ fontSize: 12, marginTop: "-2px" }} />  {item?.expireOn ? dayjs(item.expireOn).format("DD MMM YYYY") : "-"}
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    color: "text.secondary",
                                }}
                            >

                                <PostAdd sx={{ fontSize: 15, }} />
                                Required Docs: {item?.totalRequirdDocs || 0}
                            </Typography>

                        </Card>

                    ))}

                    {(hasNextPage && data?.length > 0) && (
                        <Button
                            fullWidth
                            disabled={loading}
                            onClick={onShowMore}
                            sx={{ textTransform: "none", justifyContent: "flex-start" }}
                        >
                            {loading ? "Loading..." : "Show More"}
                        </Button>
                    )}
                </Box>
            </Box>
            <AppDrawer
                open={Boolean(subsidyId)}
                onClose={() => setSubsidyId(null)}
                title={`Client Subsidy detail`}
                anchor="right"
                width={1400}
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
}

// const boardData = [
//     {
//         label: "Todo",
//         value: "todo",
//         bgColor: "#F8FAFC",
//         data: [
//             {
//                 id: "69841aa773a44229244c15ef",
//                 title: "Dashboard UI Design",
//                 description: "Create responsive dashboard layout",
//                 person: "Amy",
//             },
//         ],
//         pagination: {
//             currentPage: 1,
//             limit: 3,
//             total: 6,
//             totalPages: 2,
//             hasNextPage: true,
//             hasPrevPage: false,
//         },
//     },
// ];