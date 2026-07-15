import { ArrowOutward } from "@mui/icons-material";
import { Avatar, Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const ClientAlertList = ({
    alerts = [],
    openInDialog = false,
    cardView = false,
    open = false,
    onClose,
    title = "Alerts"
}: any) => {
    const navigate = useNavigate();

    const content = (
        <Stack spacing={1}>
            {alerts?.length ? (
                alerts.map((todo: any, index: number) => (
                    <Box
                        key={todo._id || index}
                        sx={{
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            "&:hover": { bgcolor: "action.hover" },
                        }}
                    >
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{ flex: 1, minWidth: 0 }}
                            >
                                <Avatar
                                    sx={{
                                        width: 35,
                                        height: 35,
                                        bgcolor: "warning.light",
                                    }}
                                >
                                    {todo?.ref_scheme?.scheme_name?.charAt(0)}
                                </Avatar>

                                <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                        fontWeight={600}
                                        fontSize={14}
                                        noWrap
                                    >
                                        {todo?.ref_scheme?.scheme_name}

                                        <Box
                                            component="code"
                                            sx={{
                                                ml: 1,
                                                fontSize: 12,
                                                bgcolor: "grey.100",
                                                px: 0.5,
                                                py: 0.2,
                                                borderRadius: 0.5,
                                                fontFamily: "monospace",
                                                color: "text.secondary",
                                            }}
                                        >
                                            {todo?.ref_case?.case_number}
                                        </Box>
                                    </Typography>

                                    {!!todo?.remark && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: "block",
                                                mt: 0.3,
                                            }}
                                        >
                                            {todo.remark}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>

                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/client-case/${todo?.case_id}/${todo?.scheme_id}`)}
                            >
                                <ArrowOutward fontSize="small" />
                            </IconButton>
                        </Stack>

                        {index !== alerts.length - 1 && (
                            <Divider sx={{ mt: 1 }} />
                        )}
                    </Box>
                ))
            ) : (
                <Typography
                    color="text.secondary"
                    textAlign="center"
                    py={3}
                >
                    No alerts available.
                </Typography>
            )}
        </Stack>
    );

    if (!openInDialog && !cardView) {
        return content;
    }

    if (cardView) {
        return (
            <Card sx={{ mt: 2, width: "50%" }}>
                <CardHeader
                    title={title}
                    titleTypographyProps={{
                        fontSize: 16,
                        fontWeight: 600,
                    }}
                />
                <Divider />
                <CardContent sx={{ p: 1 }}>
                    {content}
                </CardContent>
            </Card>
        );
    }


    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>{title}</DialogTitle>

            <DialogContent dividers sx={{ p: 1 }}>
                {content}
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ClientAlertList