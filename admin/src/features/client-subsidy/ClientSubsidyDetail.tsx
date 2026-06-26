import { ArrowBack, ArrowForward, Assignment, DescriptionOutlined, Edit, TrendingUp, Visibility, Close as CloseIcon, DescriptionOutlined as DescriptionOutlinedIcon } from "@mui/icons-material";
import {
    Box,
    Button,
    ButtonGroup,
    Card,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Tooltip,
    Typography,
} from "@mui/material";

import Grid from "@mui/material/Grid2";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clientSubsidyAPI } from "@/api/clientSubsidy";
import { SYSTEM_FORM_NAMES } from "@/utils/formUtils";
import { formEntriesAPI } from "@/api/forms";
import dayjs from "dayjs";
import { AppDrawer } from "@/components/common/AppDrawer";
import DocumentManager from "./DocumentManager";
import { useAppAlert } from "@/components/common/AppAlert";

export default function ClientSubsidyDetail() {
    const [subsidyDetail, setSubsidyDetail] = useState<any>(null);
    const [documentMode, setDocumentMode] = useState<any>(null);
    const [openDocumentList, setOpenDocumentList] = useState(false);
    const [activeStage, setActiveStage] = useState(0);

    const navigate = useNavigate();
    const { id } = useParams();
    const { showAlert } = useAppAlert();

    const { data: stagesList = [] } = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.APPLICABLE_STAGES],
        queryFn: async () => {
            try {
                const response = await formEntriesAPI.getAll({
                    formName: SYSTEM_FORM_NAMES.APPLICABLE_STAGES, page: 1, limit: 10,
                });
                return response.data || [];
            } catch (error: any) {
                showAlert('error', error.response?.data?.message);
            }
        },
    });

    const sortedStages = [...(stagesList || [])].sort((a: any, b: any) => a?.payload?.order_index - b?.payload?.order_index);
    const currentStageIndex = sortedStages.findIndex((stage: any) => stage?.payload?.label === subsidyDetail?.current_stage_ref?.label);

    useEffect(() => {
        if (currentStageIndex >= 0) {
            setActiveStage(currentStageIndex);
        }
    }, [currentStageIndex]);

    const {
        data: clientSubsidydetail,
    } = useQuery({
        queryKey: ['client_subsidy', id],
        queryFn: async () => {
            if (!id) return;
            return await clientSubsidyAPI.getById(id);

        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });

    useEffect(() => {
        setSubsidyDetail(clientSubsidydetail?.[0])
    }, [clientSubsidydetail])

    const handleStageStep = (selectedIdx: number, direction?: string) => {
        let nextStage = selectedIdx;
        if (direction) nextStage = direction === '+' ? selectedIdx + 1 : selectedIdx - 1
        setActiveStage((nextStage) % stagesList?.length);
    };

    const headerFields = [
        {
            label: "Case No",
            value: subsidyDetail?.case_number || '-',
        },
        {
            label: "Subsidy Name",
            value: subsidyDetail?.subsidy_ref?.subsidy_name || '-',
        },
        {
            label: "Client Name",
            value: subsidyDetail?.client?.name || '-',
        },
        {
            label: "Assigned Executive",
            value: subsidyDetail?.assigned_executive?.name || '-',
        },
        {
            label: "State",
            value: subsidyDetail?.state || '-',
        },
        {
            label: "Current Stage",
            value: subsidyDetail?.current_stage_ref?.label || '-',
            isStatus: true
        },
        {
            label: "Department",
            value: subsidyDetail?.subsidy_ref?.government_department || '-',
        },
        {
            label: "Created At",
            value: dayjs(subsidyDetail?.createdAt).format("DD-MM-YYYY") || '-',
        },
        {
            label: "Updated At",
            value: dayjs(subsidyDetail?.updatedAt).format("DD-MM-YYYY") || '-',
        },
    ];

    const goToListingPage = () => { navigate('/client-subsidy') }

    const actionButton = (
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
            <Tooltip title="Go Back" placement="bottom" arrow>
                <Button
                    onClick={goToListingPage}
                    variant={'contained'}
                    color="primary"
                >
                    <ArrowBack fontSize="small" />
                </Button>
            </Tooltip>
        </ButtonGroup>
    );

    const getColor = (item: any) => {
        if (item?.label === 'Current Stage') return subsidyDetail?.current_stage_ref?.bgColor;
        else return 'primary.main';
    }
    return (
        <>
            <Box>
                <Stack spacing={3}>
                    <PageHeader
                        title="Client Subsidy detail"
                        icon="Assignment"
                        fallbackIcon={Assignment}
                        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
                        actions={actionButton}
                    />

                    {/* Header Section */}
                    <Card sx={{ p: 2, borderRadius: 1 }}>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "repeat(2, 1fr)",
                                    md: "repeat(3, 1fr)",
                                    lg: "repeat(5, 1fr)",
                                },
                                gap: 2,
                            }}
                        >
                            {headerFields.map((item) => (
                                <Box key={item?.label}>
                                    <Typography variant="caption" color="text.secondary">
                                        {item?.label}
                                    </Typography>

                                    {item?.isStatus ?
                                        <Typography fontWeight={600} fontSize={13}>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={item?.value}
                                                sx={{ bgcolor: `${getColor(item)}`, borderColor: `${getColor(item)}` }}
                                            />
                                        </Typography>
                                        :
                                        <Typography fontWeight={600} fontSize={13}>
                                            {item?.value}
                                        </Typography>}
                                </Box>
                            ))}
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 1 }}
                        >
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<DescriptionOutlined />}
                                label={
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="body2">Documents: {(subsidyDetail?.subsidy_ref?.requird_docs_ref?.length || 0)} required</Typography>

                                        {subsidyDetail?.subsidy_ref?.requird_docs_ref?.length > 0 && <Tooltip title="View Documents" placement="bottom" arrow>
                                            <Visibility fontSize="small" sx={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDocumentList(true);
                                                }}
                                            />
                                        </Tooltip>}

                                        {/* <Tooltip title="View Documents" placement="bottom" arrow>
                                            <Visibility fontSize="small" sx={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentMode('view');
                                                }}
                                            />
                                        </Tooltip>

                                        <Tooltip title="Edit Documents" placement="bottom" arrow>
                                            <Edit fontSize="small" sx={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentMode('edit');
                                                }}
                                            />
                                        </Tooltip> */}
                                    </Stack>
                                }
                                sx={{ p: 1, color: 'primary.main', borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' }, cursor: 'pointer' }}
                            />

                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Progress: ${subsidyDetail?.subsidy_ref?.requird_docs_ref?.length
                                    ? Math.round(
                                        ((subsidyDetail?.documents?.length || 0) /
                                            subsidyDetail?.subsidy_ref?.requird_docs_ref?.length) * 100
                                    ) : 0}%`}
                                icon={<TrendingUp />}
                                sx={{ p: 1, color: 'primary.main', borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' } }}
                            />
                        </Stack>
                    </Card>

                    {/* Main Content */}
                    <Grid container spacing={3} sx={{ alignItems: "stretch", }}>
                        {/* Left Stepper */}
                        <Grid size={{ xs: 12, md: 3, lg: 2.5 }} sx={{ display: "flex", }}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    fontWeight={600}
                                    mb={3}
                                >
                                    Stages & Progress
                                </Typography>

                                <Stepper
                                    activeStep={activeStage}
                                    orientation="vertical"
                                >
                                    {sortedStages.map((stage: any, idx) => (
                                        <Step key={stage?.payload?.label}>
                                            <StepLabel
                                                onClick={() => { if (idx <= currentStageIndex) { handleStageStep(idx); } }}
                                                sx={{
                                                    cursor: idx <= currentStageIndex ? "pointer" : "not-allowed",
                                                    opacity: idx <= currentStageIndex ? 1 : 0.5
                                                }}
                                            >
                                                <Typography fontWeight={600}>
                                                    {stage?.payload?.label}
                                                </Typography>

                                                {stage?.createdAt && (
                                                    <Typography variant="body2" sx={{ mt: 1 }} >
                                                        {dayjs(subsidyDetail?.createdAt).format("DD-MM-YYYY")}
                                                    </Typography>
                                                )}
                                            </StepLabel>

                                            <StepContent>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    {stage?.payload?.description}
                                                </Typography>
                                            </StepContent>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Paper>
                        </Grid>

                        {/* Right Stage Detail */}
                        <Grid size={{ xs: 12, md: 9, lg: 9.5 }} sx={{ display: "flex", }}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    width: "100%",
                                    minHeight: '450px',
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    mb={1}
                                >
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<ArrowBack />}
                                        onClick={() => handleStageStep(activeStage, '-')}
                                        disabled={activeStage === 0}
                                    >
                                        Prev Stage
                                    </Button>

                                    <Typography
                                        variant="h6"
                                        fontWeight={600}
                                        textAlign={"center"}
                                    >
                                        Stage Detail
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        endIcon={<ArrowForward />}
                                        onClick={() => handleStageStep(activeStage, '+')}
                                        disabled={activeStage >= currentStageIndex}
                                    >
                                        Next Stage
                                    </Button>
                                </Box>

                                <Divider sx={{ mb: 1 }} />

                                <Stack
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={2}
                                    height="100%"
                                >
                                    <Typography
                                        variant="overline"
                                        color="primary"
                                    >
                                        CURRENT STAGE
                                    </Typography>

                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        textAlign="center"
                                    >
                                        {sortedStages[activeStage]?.payload?.label}
                                    </Typography>

                                    <Typography
                                        variant="body1"
                                        color="text.secondary"
                                        textAlign="center"
                                        maxWidth={500}
                                    >
                                        {sortedStages[activeStage]?.description}
                                    </Typography>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Stack>
            </Box>

            <AppDrawer open={Boolean(documentMode)} onClose={() => setDocumentMode(null)} title={`${documentMode == "edit" ? "Edit" : "View"} Document`} anchor="right" width={600}>
                <DocumentManager
                    caseDetail={subsidyDetail}
                    documentMode={documentMode}
                    onClose={() => setDocumentMode(false)}
                />
            </AppDrawer>

            {openDocumentList &&
                <Dialog
                    open={openDocumentList}
                    onClose={() => setOpenDocumentList(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>  Required Documents
                        <IconButton onClick={() => setOpenDocumentList(false)} sx={{ position: "absolute", right: 10, top: 10 }}  >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {subsidyDetail?.subsidy_ref?.requird_docs_ref?.map(
                                (doc: any, index: number) => (
                                    <Paper
                                        key={doc?._id}
                                        elevation={0}
                                        sx={{
                                            p: 2, display: "flex", alignItems: "center", gap: 2, border: "1px solid", borderColor: "divider", borderRadius: 2,
                                            transition: "0.2s", cursor: "pointer",
                                            "&:hover": {
                                                transform: "translateY(-2px)",
                                                boxShadow: 2
                                            }
                                        }}
                                    >
                                        <Box sx={{ width: 35, height: 35, borderRadius: "50%", bgcolor: "primary.light", display: "flex", alignItems: "center", justifyContent: "center" }}  >
                                            <DescriptionOutlinedIcon fontSize="small" />
                                        </Box>

                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" fontWeight={500}>
                                                {doc?.doc_name}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                Document {index + 1}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                )
                            )}
                        </Box>
                    </DialogContent >
                </Dialog >}
        </>
    );
}