import { Box, Card, Typography, Button, Chip, Avatar } from "@mui/material";
import { useState } from "react";

type KanbanContainerProps = {
    value: string;
    label: string;
    data: any[];
    bgColor?: string;
    width?: string;
    height?: string;
    loading?: boolean;
    pagination: {
        currentPage: number,
        limit: number,
        total: number,
        totalPages: number,
        hasNextPage: boolean,
        hasPrevPage: boolean,
    },
    onShowMore?: () => void;
    boardIndex: number;
    onDragStart: (item: any, boardIndex: number) => void;
    onDrop: (value: any) => void;
};

type KanbanBoardProps = {
    boards: any[];
    onShowMore?: (value: any) => void;
    loading?: boolean;
    onDrop?: (params: { row: any; stage: any; }) => void;
};

export default function KanbanBoard({
    boards: initialBoards,
    onShowMore,
    loading,
    onDrop
}: KanbanBoardProps) {
    const [boards, setBoards] = useState(initialBoards);
    const [dragItem, setDragItem] = useState<{ item: any; sourceBoard: number; } | null>(null);

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

        onDrop?.({ row: dragItem.item, stage: updatedBoards[destinationBoard].value });
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                p: 2,
                overflowX: "auto",
                overflowY: "hidden",
            }}
        >
            {boards.map((board, index) => (
                <KanbanItem
                    key={board.value}
                    {...board}
                    boardIndex={index}
                    loading={loading}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onShowMore={() => onShowMore?.(board)}
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
}: KanbanContainerProps) {
    const { hasNextPage } = pagination;
    return (
        <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(boardIndex)}
            sx={{
                width: "100%",
                height: "calc(100vh - 20vh)",
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
                <Chip size="small" label={data.length} />
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
                            border: "1px solid #F1F5F9",
                            "&:hover": { boxShadow: "0px 10px 18px rgba(0,0,0,.08)", border: "1px solid black" },
                        }}
                    >
                        <Typography sx={{ fontWeight: 600 }}>
                            {item?.title}
                        </Typography>

                        <Typography fontSize={12} color="text.secondary"  >
                            {item?.description}
                        </Typography>

                        <Avatar sx={{ mt: 1, width: 26, height: 26, fontSize: 11, ml: "auto" }}  >
                            {item?.person?.[0]?.toUpperCase()}
                        </Avatar>
                    </Card>

                ))}

                {hasNextPage && (
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