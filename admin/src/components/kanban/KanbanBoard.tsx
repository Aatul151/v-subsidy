import { Theme } from "@emotion/react";
import { Box, Card, Typography, Button, Chip, SxProps, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { Refresh as RefreshIcon, FolderOpenOutlined as FolderOpenOutlinedIcon, Person as PersonIcon, AccessTime as AccessTimeIcon, DescriptionOutlined as DescriptionOutlinedIcon } from '@mui/icons-material';
import dayjs from "dayjs";
import { AppDrawer } from "../common/AppDrawer";
import ClientSchemeDetail from "@/features/client-scheme/ClientSchemeDetail";
import ClientDetailDrawer from "../common/ClientDetailDrawer";

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
    onDrop?: (params: { row: any; status_id: any; }) => void;
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
        onDrop?.({ row: dragItem.item, status_id: updatedBoards[destinationBoard]._id });
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
                    {data?.map((item) => (
                        <Card
                            key={item?.id}
                            draggable
                            onDragStart={() => onDragStart(item, boardIndex)}
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                border: "1px solid #E5E7EB",
                                cursor: "grab",
                                "&:hover": {
                                    boxShadow: 2,
                                    borderColor: "primary.main",
                                },
                            }}
                        >
                            {/* Scheme */}
                            <Typography fontSize={12} fontWeight={600}> {item?.scheme_ref?.[0]?.scheme_name} </Typography>

                            {/* Case Number */}
                            <Typography fontSize={11} color="text.secondary" fontFamily={"monospace"} sx={{ mt: 0.3 }} >
                                {item?.case_number}
                            </Typography>

                            {/* Client */}
                            <Box display="flex" alignItems="center" mt={0.5} gap={0.5}>
                                <PersonIcon sx={{ fontSize: 15, color: "text.secondary" }} />

                                <Typography fontSize={13} fontWeight={600} color="primary"
                                    sx={{ cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setClientId(item?.clientId);
                                    }}
                                >
                                    {item?.person}
                                </Typography>
                            </Box>

                            {/* Footer Box */}
                            <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, bgcolor: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Box>
                                    {/* Expire on */}
                                    <Typography
                                        display={"flex"}
                                        alignItems={"center"}
                                        gap={0.5}
                                        mt={0.4}
                                        fontSize={11}
                                        fontWeight={500}
                                        color={dayjs(item?.expireOn).startOf("day").isBefore(dayjs().startOf("day")) ? "error.main" : "text.secondary"}
                                    >
                                        <AccessTimeIcon sx={{ fontSize: 14 }} /> {item?.expireOn ? dayjs(item.expireOn).format("DD MMM YYYY") : "-"}
                                    </Typography>

                                    {/* Documents count */}
                                    <Typography
                                        display="flex"
                                        alignItems="center"
                                        gap={0.5}
                                        fontSize={11}
                                        fontWeight={500}
                                        mt={0.4}
                                        color={item?.totalDocCount?.isAllUploaded ? "success.main" : "text.secondary"}
                                    >
                                        <DescriptionOutlinedIcon sx={{ fontSize: 14 }} />
                                        {item?.totalDocCount?.totalCount === 0 ? (
                                            "No Documents"
                                        ) : item?.totalDocCount?.isAllUploaded ? (
                                            "Documents Uploaded"
                                        ) : (
                                            <>
                                                {item?.totalDocCount?.uploadedCount ?? 0}/
                                                {item?.totalDocCount?.totalCount} Docs

                                                <Box
                                                    component="span"
                                                    sx={{
                                                        ml: 0.2,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    ({item?.totalDocCount?.remainingCount} left)
                                                </Box>
                                            </>
                                        )}
                                    </Typography>
                                </Box>

                                <IconButton
                                    size="small"
                                    onClick={() => setSubsidyId(item?.id)}
                                    sx={{
                                        bgcolor: "background.paper",
                                        borderColor: "divider",
                                    }}
                                >
                                    <FolderOpenOutlinedIcon fontSize="small" />
                                </IconButton>

                            </Box>
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
            </Box >
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
                <ClientDetailDrawer
                    open={Boolean(clientId)}
                    onClose={() => setClientId(null)}
                    clientId={clientId}
                />
            }
        </>
    );
}