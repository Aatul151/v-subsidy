import { ArrowBack, ArrowForward, Assignment, DescriptionOutlined, Edit, TrendingUp, Visibility } from "@mui/icons-material";
import {
    Box,
    Button,
    ButtonGroup,
    Card,
    Chip,
    Divider,
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
    const [activeStage, setActiveStage] = useState(0);
    const [subsidyDetail, setSubsidyDetail] = useState<any>(null);
    const [documentMode, setDocumentMode] = useState<any>(null);
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
        let nextStage = selectedIdx
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
        if (item?.label === 'Current Stage') return 'secondary.main'
        else return 'primary.main'
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
                                                sx={{ bgcolor: `${getColor(item)}`, color: 'white', borderColor: `${getColor(item)}` }}
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
                                        <Typography variant="body2">Documents: 3 out of 5</Typography>

                                        <Tooltip title="View Documents" placement="bottom" arrow>
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
                                        </Tooltip>
                                    </Stack>
                                }
                                sx={{ p: 1, color: 'primary.main', borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' }, cursor: 'pointer' }}
                            />

                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Progress: ${(activeStage / stagesList?.length) * 100} %`}
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
                                    {[...(stagesList || [])]
                                        .sort((a: any, b: any) => a?.payload?.orderIndex - b?.payload?.orderIndex)
                                        .map((stage: any, idx) => (
                                            <Step key={stage?.payload?.label}>
                                                <StepLabel onClick={() => { if (idx <= activeStage) { handleStageStep(idx) } }} sx={{ cursor: "pointer" }}>
                                                    <Typography fontWeight={600}>
                                                        {stage?.payload?.label}
                                                    </Typography>
                                                    {stage?.createdAt && <Typography color="text.secondary" variant="subtitle2" fontWeight={600} fontSize={12}>
                                                        {stage?.createdAt}
                                                    </Typography>}
                                                </StepLabel>

                                                <StepContent>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ mt: 1 }}
                                                    >
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
                                        disabled={activeStage === stagesList.length - 1}
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
                                        {stagesList[activeStage]?.payload?.label}
                                    </Typography>

                                    <Typography
                                        variant="body1"
                                        color="text.secondary"
                                        textAlign="center"
                                        maxWidth={500}
                                    >
                                        {stagesList[activeStage]?.description}
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
        </>
    );
}