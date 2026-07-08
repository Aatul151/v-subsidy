import { useEffect, useState } from "react";
import { ArrowBack, ArrowForward, Assignment, DescriptionOutlined, TrendingUp, Visibility, Close as CloseIcon, DescriptionOutlined as DescriptionOutlinedIcon } from "@mui/icons-material";
import {
    Box,
    Button,
    ButtonGroup,
    Card,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Tooltip,
    Typography,
} from "@mui/material";

import Grid from "@mui/material/Grid2";
import { PageHeader } from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientSubsidyAPI, UpdateClientSchemePayload } from "@/api/clientScheme";
import { SYSTEM_FORM_NAMES } from "@/utils/formUtils";
import { formEntriesAPI } from "@/api/forms";
import dayjs from "dayjs";
import { AppDrawer } from "@/components/common/AppDrawer";
import DocumentManager from "./DocumentManager";
import { useAppAlert } from "@/components/common/AppAlert";
import utc from "dayjs/plugin/utc";
import { Controller, useForm } from "react-hook-form";
import { STATUS_LIST } from "@/utils/types";

dayjs.extend(utc);

export default function ClientSchemeDetail({ id: propId }: any) {
    const navigate = useNavigate();
    const { showAlert, AlertComponent } = useAppAlert();
    const queryClient = useQueryClient();

    const { id: paramId } = useParams();
    const id = propId || paramId;

    const [schemeDetail, setSchemeDetail] = useState<any>(null);
    const [documentMode, setDocumentMode] = useState<any>(null);
    const [openDocumentList, setOpenDocumentList] = useState(false);
    const [activeStage, setActiveStage] = useState(0);
    const [submittedDocs, setSubmittedDocs] = useState<string[]>([]);

    const { control, watch, reset } = useForm({
        defaultValues: { current_stage: '', status: '', selectedSchemeId: '' },
    });

    const { current_stage, status, selectedSchemeId }: any = watch();

    const { data: statusList = [] } = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.STATUS],
        queryFn: async () => {
            try {
                const response = await formEntriesAPI.getAll({
                    formName: SYSTEM_FORM_NAMES.STATUS, page: 1, limit: 10,
                });
                return response.data || [];
            } catch (error: any) {
                showAlert('error', error.response?.data?.message);
            }
        },
    });

    useEffect(() => {
        if (openDocumentList) {
            setSubmittedDocs(schemeDetail?.submitted_docs || []);
        }
    }, [openDocumentList, schemeDetail]);

    const { data: documentsList = [] } = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.ALL_DOCUMENTS],
        queryFn: async () => {
            try {
                const response = await formEntriesAPI.getAll({
                    formName: SYSTEM_FORM_NAMES.ALL_DOCUMENTS, page: 1, limit: 100,
                });
                return response.data || [];
            } catch (error: any) {
                showAlert('error', error.response?.data?.message);
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateClientSchemePayload }) =>
            clientSubsidyAPI.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] });
            showAlert('success', 'Case updated successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to update case');
        },
    });

    const sortedStages = [...(statusList || [])].sort((a: any, b: any) => a?.payload?.order_index - b?.payload?.order_index);
    const currentStageIndex = sortedStages.findIndex((stage: any) => stage?.payload?.label === schemeDetail?.current_stage_ref?.label);

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
        const data = clientSubsidydetail?.[0];
        setSchemeDetail(data);
        if (data) {
            reset({
                status: data?.status,
                current_stage: data?.current_stage,
                selectedSchemeId: data?.scheme_ref?.[0]?._id  //default selected
            });
        }
    }, [clientSubsidydetail, reset]);

    const handleStageStep = (selectedIdx: number, direction?: string) => {
        let nextStage = selectedIdx;
        if (direction) nextStage = direction === '+' ? selectedIdx + 1 : selectedIdx - 1
        setActiveStage((nextStage) % statusList?.length);
    };

    const headerFields = [
        {
            label: "Case No",
            value: schemeDetail?.case_number || '-',
        },
        {
            label: "Scheme",
            value: schemeDetail?.scheme_ref?.find((e: any) => e?._id == selectedSchemeId)?.scheme_name || '-',
        },
        {
            label: "Client Name",
            value: schemeDetail?.client?.name || '-',
        },
        {
            label: "Assigned Executive",
            value: schemeDetail?.assigned_executive?.name || '-',
        },
        {
            label: "Expire On",
            value: dayjs.utc(schemeDetail?.expireOn).format("DD-MMM-YYYY") || '-',
        },
        {
            label: "Current Stage",
            value: schemeDetail?.current_stage?.find((d: any) => d?.scheme_id == selectedSchemeId)?.ref_stage?.name || '-',
        },
        {
            label: "Status",
            value: schemeDetail?.current_status?.find((d: any) => d?.scheme_id == selectedSchemeId)?.ref_status?.label || '-',
            isStatus: true
        },
        {
            label: "Department",
            value: schemeDetail?.scheme_ref?.find((d: any) => d?._id == selectedSchemeId)?.government_department || '-',
        },
        {
            label: "Created At",
            value: dayjs(schemeDetail?.createdAt).format("DD-MM-YYYY") || '-',
        },
        {
            label: "Updated At",
            value: dayjs(schemeDetail?.updatedAt).format("DD-MM-YYYY") || '-',
        },
    ];

    const goToListingPage = () => { navigate('/client-case') }

    const actionButton = (
        <>
            <Controller
                name="selectedSchemeId"
                control={control}
                render={({ field }) => (
                    <FormControl sx={{ width: 200 }} size="small">
                        <InputLabel id="client-label">Scheme </InputLabel>
                        <Select
                            {...field}
                            onChange={(e) => { field.onChange(e); }}
                            labelId="scheme-label"
                            label="scheme"
                        >
                            {schemeDetail?.scheme_ref?.map((val: any) => (<MenuItem key={val?._id} value={val?._id}>{val?.scheme_name}</MenuItem>))}
                        </Select>
                    </FormControl>
                )}
            />
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
        </>
    );

    const getColor = (item: any) => {
        if (item?.label === 'Status') return schemeDetail?.current_status?.filter((d: any) => d?.scheme_id == selectedSchemeId)?.[0]?.ref_status?.bgColor;
        else return 'primary.main';
    }

    const displayUpdateBtn = current_stage !== schemeDetail?.current_stage || status !== schemeDetail?.status;

    const handleUpdate = async () => {
        const payload = { status, current_stage }
        await updateMutation.mutateAsync({ id, payload });
    }

    const handleDocumentCheck = (docId: string) => {
        setSubmittedDocs((prev: any) =>
            prev.includes(docId)
                ? prev.filter((id: any) => id != docId)
                : [...prev, docId]
        );
    };

    const handleSaveDocuments = async () => {
        try {
            const payload = { submitted_docs: submittedDocs || [] }
            await updateMutation.mutateAsync({ id, payload });
            setOpenDocumentList(false);
        } catch (err) {
            console.error(err);
        }
    };

    const totalDocs = schemeDetail?.subsidy_ref?.requird_docs?.length || 0;
    const submittedCount = schemeDetail?.submitted_docs?.length || 0;
    const percentage = submittedCount > 0 ? Number(((submittedCount / totalDocs) * 100).toFixed(1)) : 0;

    return (
        <>
            <Box>
                {AlertComponent}
                <Stack spacing={3}>
                    {!propId && (
                        <PageHeader
                            title="Client Subsidy detail"
                            icon="Assignment"
                            fallbackIcon={Assignment}
                            sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
                            actions={actionButton}
                        />
                    )}

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
                                        <Typography fontWeight={600} fontSize={13} sx={{ textTransform: "Capitalize" }}>
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
                            sx={{ mt: 2 }}
                        >
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<DescriptionOutlined />}
                                label={
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="body2">Documents: {(schemeDetail?.subsidy_ref?.requird_docs?.length || 0)} required</Typography>

                                        {schemeDetail?.subsidy_ref?.requird_docs?.length > 0 && <Tooltip title="View Documents" placement="bottom" arrow>
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
                                label={`Progress: ${percentage || 0}%`}
                                icon={<TrendingUp />}
                                sx={{ p: 1, color: 'primary.main', borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' } }}
                            />

                            <Box sx={{ ml: "auto", display: "flex", gap: 1, flexWrap: "wrap", }} >
                                <Controller
                                    name="current_stage"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl sx={{ width: 200 }} size="small">
                                            <InputLabel>Stage</InputLabel>
                                            <Select {...field} label="Stage">
                                                {statusList
                                                    ?.sort((a: any, b: any) => a?.payload?.order_index - b?.payload?.order_index)
                                                    ?.map((stage: any) => (
                                                        <MenuItem key={stage?._id} value={stage?._id}>
                                                            {stage?.payload?.label}
                                                        </MenuItem>
                                                    ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />

                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl sx={{ width: 200 }} size="small">
                                            <InputLabel>Status</InputLabel>
                                            <Select {...field} label="Status" >
                                                {STATUS_LIST?.map((val: any) => (<MenuItem value={val?.value}> {val?.label}</MenuItem>))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />

                                {displayUpdateBtn && (
                                    <Button variant="contained" size="small" onClick={handleUpdate}>
                                        Update
                                    </Button>
                                )}

                            </Box>
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
                                                        {dayjs(schemeDetail?.createdAt).format("DD-MM-YYYY")}
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
                    caseDetail={schemeDetail}
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
                            {schemeDetail?.subsidy_ref?.requird_docs?.map((docId: string, index: number) => {
                                const document = documentsList?.find((d: any) => d?._id == docId);
                                return (
                                    <Paper
                                        key={docId}
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
                                                {document?.payload?.doc_name || "Unknown Document"}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                Document {index + 1}
                                            </Typography>
                                        </Box>

                                        <Checkbox
                                            checked={submittedDocs?.includes(docId)}
                                            onChange={() => handleDocumentCheck(docId)}
                                            color="primary"
                                        />
                                    </Paper>
                                )
                            })}
                        </Box>
                    </DialogContent >
                    <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                        <Button variant="outlined" color="inherit" onClick={() => setOpenDocumentList(false)}>
                            Cancel
                        </Button>

                        <Button variant="contained" color="primary" onClick={() => handleSaveDocuments()}>
                            Save
                        </Button>
                    </DialogActions>
                </Dialog >}
        </>
    );
}