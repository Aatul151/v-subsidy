import { ArrowBack, ArrowForward, Assignment, DescriptionOutlined, TrendingUp } from "@mui/icons-material";
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
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";

const stages = [
    {
        name: "Application Submitted",
        createdAt: "10 Jun 2026, 10:30 AM",
        description: "Application and initial documents submitted.",
    },
    {
        name: "Verification",
        createdAt: "11 Jun 2026, 02:00 PM",
        description: "Documents are under verification.",
    },
    {
        name: "Inspection",
        createdAt: "",
        description: "Inspection will be scheduled.",
    },
    {
        name: "Approval",
        createdAt: "",
        description: "Awaiting approval.",
    },
    {
        name: "Disbursement",
        createdAt: "",
        description: "Subsidy amount will be released.",
    },
];

const subsidyCase = {
    caseNo: "CASE-2026-0001",
    subsidyName: "MSME Subsidy",
    clientName: "ABC Industries",
    assignedExecutive: "Karan Patel",

    currentStage: "Verification",
    currentStatus: "Active",
    state: "Gujarat",
    department: "MSME",

    documentsUploaded: 3,
    totalDocuments: 5,
    progress: 40,

    createdAt: "10 Jun 2026",
    updatedAt: "12 Jun 2026",
};

export default function ClientSubsidyDetail() {
    const [activeStage, setActiveStage] = useState(0);
    const [subsidyDetail, setSubsidyDetail] = useState(subsidyCase);
    const navigate = useNavigate();
    const { id } = useParams();

    const handleStageStep = (selectedIdx: number, direction?: string) => {
        let nextStage = selectedIdx
        if (direction) nextStage = direction === '+' ? selectedIdx + 1 : selectedIdx - 1
        setActiveStage((nextStage) % stages?.length);
    };

    const headerFields = [
        {
            label: "Case No",
            value: subsidyDetail?.caseNo,
        },
        {
            label: "Subsidy Name",
            value: subsidyDetail?.subsidyName,
        },
        {
            label: "Client Name",
            value: subsidyDetail?.clientName,
        },
        {
            label: "Assigned Executive",
            value: subsidyDetail?.assignedExecutive,
        },
        {
            label: "State",
            value: subsidyDetail?.state,
        },
        {
            label: "Current Stage",
            value: stages[activeStage]?.name,
            isStatus: true
        },
        {
            label: "Current Status",
            value: subsidyDetail?.currentStatus,
            isStatus: true
        },
        {
            label: "Department",
            value: subsidyDetail?.department,
        },
        {
            label: "Created At",
            value: subsidyDetail?.createdAt,
        },
        {
            label: "Updated At",
            value: subsidyDetail?.updatedAt,
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
                                label="Documents: 3/5"
                                sx={{ p: 1, color: 'primary.main', borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' } }}
                            />

                            <Chip
                                size="small"
                                variant="outlined"
                                label={`Progress: ${(activeStage / stages?.length) * 100} %`}
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
                                    {stages.map((stage, idx) => (
                                        <Step key={stage.name}>
                                            <StepLabel onClick={() => { if (idx <= activeStage) { handleStageStep(idx) } }} sx={{ cursor: "pointer" }}>
                                                <Typography fontWeight={600}>
                                                    {stage.name}
                                                </Typography>
                                                {stage?.createdAt && <Typography color="text.secondary" variant="subtitle2" fontWeight={600} fontSize={12}>
                                                    {stage.createdAt}
                                                </Typography>}
                                            </StepLabel>

                                            <StepContent>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ mt: 1 }}
                                                >
                                                    {stage.description}
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
                                        disabled={activeStage === stages.length - 1}
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
                                        {stages[activeStage]?.name}
                                    </Typography>

                                    <Typography
                                        variant="body1"
                                        color="text.secondary"
                                        textAlign="center"
                                        maxWidth={500}
                                    >
                                        {stages[activeStage]?.description}
                                    </Typography>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Stack>
            </Box>
        </>
    );
}