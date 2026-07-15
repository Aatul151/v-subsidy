import { useEffect, useMemo, useState } from "react";
import { ArrowBack, Assignment, DescriptionOutlined, TrendingUp, Visibility, Close as CloseIcon, DescriptionOutlined as DescriptionOutlinedIcon, CheckCircle, SearchOff, InfoOutlined, NotificationsActiveOutlined } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
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
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import Grid from "@mui/material/Grid2";
import { PageHeader } from "../../components/common/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientSubsidyAPI, UpdateClientSchemePayload } from "@/api/clientScheme";
import { formatDateTime, SYSTEM_FORM_NAMES } from "@/utils/formUtils";
import { formEntriesAPI } from "@/api/forms";
import dayjs, { Dayjs } from "dayjs";
import { AppDrawer } from "@/components/common/AppDrawer";
import DocumentManager from "./DocumentManager";
import { useAppAlert } from "@/components/common/AppAlert";
import utc from "dayjs/plugin/utc";
import { Controller, useForm } from "react-hook-form";
import { useMasterData } from "@/context/MasterData";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { clientsAPI } from "@/api/manageClient";
import { findSubmittedDocCount, getCurrentStatus } from "@/utils/commonFunctions";
import ClientDetailDrawer from "@/components/common/ClientDetailDrawer";

dayjs.extend(utc);

export default function ClientSchemeDetail({ id: propId, schemeId: propsSchemeId }: any) {
    const navigate = useNavigate();
    const { showAlert, AlertComponent } = useAppAlert();
    const queryClient = useQueryClient();
    const { statusList, stageList } = useMasterData();

    const { id: paramId, schemeId: paramSchemeId } = useParams();
    const id = propId || paramId;
    const defaultSchemeId = propsSchemeId || paramSchemeId;

    const [caseDetail, setCaseDetail] = useState<any>(null);
    const [documentMode, setDocumentMode] = useState<any>(null);
    const [openDocumentList, setOpenDocumentList] = useState(false);
    const [activeStep, setActiveStep] = useState(-1);
    const [submittedDocs, setSubmittedDocs] = useState<string[]>([]);
    const [selecteClientId, setSelecteClientId] = useState<any>(null);
    const [tab, setTab] = useState("loan_form_tab");

    const { control, watch, reset, getValues, setValue } = useForm({
        defaultValues: {
            selectedSchemeId: '',
            sectionForm: {
                loan_sanction_date: null as Dayjs | null,
                first_disbursement_date: null as Dayjs | null,
                first_sale_bill_amount: '',
                loan_amount: '',
                disbursement_amount: '',
                sanction_amount: '',
            },
            statusForm: {
                stage: "",
                status: "",
                remark: ""
            },
            stageForm: {
                stage: "",
                end_date: null as Dayjs | null,
                remark: ""
            },
            todoForm: {
                remark: ""
            }
        },
    });

    const { selectedSchemeId }: any = watch();

    useEffect(() => {
        if (openDocumentList) {
            setSubmittedDocs(caseDetail?.submitted_docs || []);
        }
    }, [openDocumentList, caseDetail]);

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

    const updateTodoMutation = useMutation({
        mutationFn: ({ id, payload }: {
            id: string;
            payload: UpdateClientSchemePayload;
            taskCompleted: boolean;
        }) => clientsAPI.update(id, payload),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["client_subsidy"] });
            showAlert("success", variables.taskCompleted ? "Task marked as completed successfully!" : "Todo remark updated successfully!");
        },
        onError: (error: any) => {
            showAlert("error", error.response?.data?.message || "Failed to update remark");
        },
    });

    const { data: clientSubsidydetail } = useQuery({
        queryKey: ["client_subsidy", id],
        queryFn: () => clientSubsidyAPI.getById(id),
        enabled: !!id,
        placeholderData: (previousData) => previousData,
    });

    useEffect(() => {
        if (clientSubsidydetail?.length) {
            setCaseDetail(clientSubsidydetail[0]);
        }
    }, [clientSubsidydetail]);

    const clientId = useMemo(() => caseDetail?.client?._id, [caseDetail?.client?._id]);

    const { data: clientScheme = [] } = useQuery({
        queryKey: ["client_scheme", clientId],
        queryFn: async () => {
            const response = await clientSubsidyAPI.getClientScheme(clientId);
            return response || [];
        },
        enabled: !!clientId,
    });


    const currentStage = useMemo(() => {
        return caseDetail?.current_stage?.find((item: any) => item.scheme_id == selectedSchemeId);
    }, [caseDetail, selectedSchemeId]);

    const currentStatus = useMemo(() =>
        getCurrentStatus(caseDetail?.current_status, caseDetail?.current_stage, selectedSchemeId),
        [caseDetail?.current_status, caseDetail?.current_stage, selectedSchemeId]
    );

    //Status history details 
    const { data: stepperInfo } = useQuery({
        queryKey: ['client_status', id, selectedSchemeId, currentStage?.stage_id],
        queryFn: async () => {
            return await clientSubsidyAPI.getStatusHistory(id, selectedSchemeId, currentStage?.stage_id);
        },
        enabled: !!id && !!selectedSchemeId && !!currentStage?.stage_id,
    });

    const formattedStatusList = statusList
        ?.sort((a: any, b: any) => a?.payload?.order_index - b?.payload?.order_index)
        ?.map((status: any) => ({
            ...status,
            statusProgress: stepperInfo?.statusHistory?.find((item: any) => item?.scheme_id == selectedSchemeId && item?.status_id == status?._id && item?.stage_id == currentStage?.stage_id),
        }));

    const formattedStageList = stageList?.map((stage: any) => ({
        ...stage,
        stageProgress: stepperInfo?.stageHistory?.find((item: any) => item?.stage_id == stage?._id && item?.scheme_id == selectedSchemeId),
    }));

    const activeStatusIndex = formattedStatusList.findIndex((item: any) => !item.statusProgress?.completed_date);


    useEffect(() => {
        setActiveStep(activeStatusIndex);
    }, [activeStatusIndex]);

    const clientTodoRemark = useMemo(() => {
        return caseDetail?.client?.case_todos.find((e: any) => e?.case_id == id && e?.scheme_id == selectedSchemeId)?.remark;
    }, [caseDetail, selectedSchemeId]);

    useEffect(() => {
        if (caseDetail) {
            reset({
                selectedSchemeId: defaultSchemeId || caseDetail?.scheme_ref?.[0]?._id || "",
                sectionForm: {
                    loan_sanction_date: caseDetail?.loan_sanction_date ? dayjs(caseDetail.loan_sanction_date) : null,
                    first_disbursement_date: caseDetail?.first_disbursement_date ? dayjs(caseDetail.first_disbursement_date) : null,
                    first_sale_bill_amount: caseDetail?.first_sale_bill_amount || "",
                    loan_amount: caseDetail?.loan_amount || "",
                    disbursement_amount: caseDetail?.disbursement_amount || "",
                    sanction_amount: caseDetail?.sanction_amount || "",
                },
                todoForm: {
                    remark: clientTodoRemark || "",
                }
            });
        }
    }, [caseDetail, reset, selectedSchemeId]);

    useEffect(() => {
        reset({
            ...getValues(),
            statusForm: {
                stage: currentStage?.stage_id || "",
                status: currentStatus?.status_id || "",
                remark: currentStatus?.remarks || "",
            },
            stageForm: {
                stage: currentStage?.stage_id || "",
                end_date: currentStage?.end_date ? dayjs(currentStage.end_date) : null,
                remark: currentStage?.remarks || "",
            }
        });
    }, [currentStage, currentStatus, caseDetail]);

    const headerFields = [
        {
            label: "Case No",
            value: caseDetail?.case_number || '-',
        },
        {
            label: "Scheme",
            value: caseDetail?.scheme_ref?.find((e: any) => e?._id == selectedSchemeId)?.scheme_name || '-',
        },
        {
            label: "Client Name",
            value: caseDetail?.client?.name || '-',
            onclick: () => setSelecteClientId(caseDetail?.client?._id)
        },
        {
            label: "Assigned Executive",
            value: caseDetail?.assigned_executive?.name || '-',
        },
        {
            label: dayjs(caseDetail?.expireOn).startOf("day").isBefore(dayjs().startOf("day")) ? "Expired" : "Expire On",
            value: formatDateTime(caseDetail?.expireOn),
            color: dayjs(caseDetail?.expireOn).startOf("day").isBefore(dayjs().startOf("day")) ? "error.main" : ""
        },
        {
            label: "Current Stage",
            value: currentStage?.ref_stage?.name || "-",
        },
        {
            label: "Status",
            value: currentStatus?.ref_status?.label,
            isStatus: true
        },
        {
            label: "Department",
            value: caseDetail?.scheme_ref?.find((d: any) => d?._id == selectedSchemeId)?.government_department || '-',
        },
        {
            label: "Created At",
            value: formatDateTime(caseDetail?.createdAt) || "-",
        },
        {
            label: "Updated At",
            value: formatDateTime(caseDetail?.updatedAt) || '-',
        },
    ];

    const actionButton = (
        <>
            {clientScheme?.length > 1 && (
                <Controller
                    name="selectedSchemeId"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            size="small"
                            sx={{ width: 250 }}
                            options={clientScheme || []}
                            value={clientScheme?.find((item: any) => item?._id === id) || null}
                            getOptionLabel={(option: any) => `${option?.ref_scheme?.scheme_name} - ${option?.case_number} ` || ""}
                            isOptionEqualToValue={(option, value) => option?._id == value?._id}
                            onChange={(_, value) => {
                                if (value?._id) {
                                    field.onChange(value._id);
                                    navigate(`/client-case/${value._id}`);
                                }
                            }}
                            renderInput={(params) => (<TextField  {...params} label="Scheme" placeholder="Search Scheme" size="small" />)}
                        />
                    )}
                />
            )}

            <Tooltip title="Go Back" placement="bottom" arrow>
                <Button
                    size="small"
                    onClick={() => { navigate(`/client-case`) }}
                    variant={'contained'}
                    color="primary"
                >
                    <ArrowBack fontSize="small" />
                </Button>
            </Tooltip>
        </>
    );

    const getColor = (item: any) => {
        if (item?.label === 'Status') return currentStatus?.ref_status?.bgColor;
        else return 'primary.main';
    }

    const handleDocumentCheck = (docId: string) => {
        setSubmittedDocs((prev: any[]) => {
            const exists = prev?.some((doc) => doc?.scheme_id == selectedSchemeId && doc?.docId == docId);

            if (exists) {
                return prev?.filter((doc) => !(doc?.scheme_id == selectedSchemeId && doc?.docId == docId)); // Remove From Doc
            }
            return [...prev, { docId, scheme_id: selectedSchemeId }]; // Add In Doc
        });
    };

    const handleSaveDocuments = async () => {
        try {
            const payload = { submitted_docs: submittedDocs }
            await updateMutation.mutateAsync({ id, payload });
            setOpenDocumentList(false);
        } catch (err) {
            console.error(err);
        }
    };

    const docCount = findSubmittedDocCount(caseDetail?.submitted_docs, caseDetail?.scheme_ref, selectedSchemeId);
    const percentage = formattedStatusList?.length > 0 ? Number((((activeStep + 1) / formattedStatusList?.length) * 100)?.toFixed(1)) : 0;

    const handleStatusChange = (statusId: string) => {
        const remarkFieldValue = formattedStatusList?.find(
            (item: any) =>
                item.statusProgress?.scheme_id == selectedSchemeId &&
                item.statusProgress?.stage_id == currentStage?.stage_id &&
                item.statusProgress?.status_id == statusId
        )?.statusProgress?.remarks;

        setValue("statusForm.remark", remarkFieldValue || "");
    };

    const handleStageChange = (stageId: string) => {
        const fieldValue = formattedStageList?.find(
            (item: any) =>
                item.stageProgress?.scheme_id == selectedSchemeId &&
                item.stageProgress?.stage_id == stageId
        )?.stageProgress;

        setValue("stageForm.remark", fieldValue?.remarks || "");
        setValue("stageForm.end_date", fieldValue?.end_date ? dayjs(fieldValue?.end_date) : null);
    };

    const renderTabContent = () => {
        switch (tab) {
            case "loan_form_tab":
                const formFields = [
                    { name: "loan_sanction_date", label: "Loan Sanction Date", type: "date" },
                    { name: "first_disbursement_date", label: "First Disbursement Date", type: "date" },
                    { name: "first_sale_bill_amount", label: "First Sale Bill Amount", type: "number" },
                    { name: "loan_amount", label: "Loan Amount", type: "number" },
                    { name: "disbursement_amount", label: "Disbursement Amount", type: "number" },
                    { name: "sanction_amount", label: "Sanction Amount", type: "number" }
                ];

                return (
                    <>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(1, 1fr)",
                                gap: 2,

                            }}
                        >
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                {formFields?.map(({ name, label, type }: any) => (
                                    <Controller
                                        key={name}
                                        name={`sectionForm.${name}` as any}
                                        control={control}
                                        render={({ field }) =>

                                            type === "date" ? (
                                                <DatePicker
                                                    label={label}
                                                    value={field.value}
                                                    format="DD/MM/YYYY"
                                                    slotProps={{
                                                        textField: {
                                                            size: "small",
                                                            fullWidth: true,
                                                        },
                                                    }}
                                                    onChange={field.onChange}
                                                />
                                            ) : (
                                                <TextField
                                                    {...field}
                                                    label={label}
                                                    type={type}
                                                    size="small"
                                                    fullWidth
                                                    value={field.value ?? ""}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                />
                                            )
                                        }
                                    />
                                ))}
                            </LocalizationProvider>
                        </Box>
                    </>
                );

            case "manage_status_tab":
                const statusFormField = [
                    { name: "stage", label: "Stage", type: "dropdown", options: stageList, disabled: true },
                    { name: "status", label: "Status", type: "dropdown", options: statusList, disabled_order: true, onChange: (value: string) => handleStatusChange(value) },
                    { name: "remark", label: "Remark", type: "text", multiline: true, rows: 4 },

                ];
                return <>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(1, 1fr)",
                            gap: 2,
                        }}
                    >
                        {statusFormField?.map(({ name, label, type, options, disabled = false, multiline, rows, disabled_order, onChange }: any) => (
                            <Controller
                                key={name}
                                name={`statusForm.${name}` as any}
                                control={control}
                                render={({ field }) =>
                                    type === "dropdown" ? (
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="client-label">{label}</InputLabel>
                                            <Select
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    onChange?.(e.target.value);
                                                }}
                                                labelId="stage-label"
                                                label="stage"
                                                disabled={disabled}
                                            >
                                                {options?.map((val: any) => (
                                                    <MenuItem
                                                        key={val?._id}
                                                        value={val?._id}
                                                        disabled={disabled_order ? val.payload.order_index > activeStatusIndex + 2 : false}
                                                    >
                                                        {val?.payload?.name || val?.payload?.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <TextField
                                            {...field}
                                            label={label}
                                            type={type}
                                            size="small"
                                            fullWidth
                                            multiline={multiline}
                                            rows={rows}
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    )
                                }
                            />
                        ))}
                    </Box>
                </>;
            case "manage_stage_tab":
                const stageFormField = [
                    { name: "stage", label: "Stage", type: "dropdown", options: stageList, onChange: (value: string) => handleStageChange(value) },
                    { name: "end_date", label: "End date", type: "date" },
                    { name: "remark", label: "Remark", type: "text", multiline: true, rows: 4 },

                ];
                return <>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(1, 1fr)",
                            gap: 2,
                        }}
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            {stageFormField?.map(({ name, label, type, options, disabled = false, multiline, rows, onChange }: any) => (
                                <Controller
                                    key={name}
                                    name={`stageForm.${name}` as any}
                                    control={control}
                                    render={({ field }) =>
                                        type === "dropdown" ? (
                                            <FormControl size="small" fullWidth>
                                                <InputLabel id="client-label">{label}</InputLabel>
                                                <Select
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e.target.value);
                                                        onChange?.(e.target.value);
                                                    }}
                                                    labelId="stage-label"
                                                    label="stage"
                                                    disabled={disabled}
                                                >
                                                    {options?.map((val: any) => (<MenuItem key={val?._id} value={val?._id}>{val?.payload?.name || val?.payload?.label}</MenuItem>))}
                                                </Select>
                                            </FormControl>
                                        ) : type === "date" ? (
                                            <DatePicker
                                                label={label}
                                                value={field.value}
                                                format="DD/MM/YYYY"
                                                slotProps={{
                                                    textField: {
                                                        size: "small",
                                                        fullWidth: true,
                                                    },
                                                }}
                                                onChange={field.onChange}
                                            />
                                        ) : (
                                            <TextField
                                                {...field}
                                                label={label}
                                                type={type}
                                                size="small"
                                                fullWidth
                                                multiline={multiline}
                                                rows={rows}
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            />
                                        )
                                    }
                                />
                            ))}
                        </LocalizationProvider>

                    </Box>
                </>;
            case "manage_todo_tab":
                const todoFormField = [
                    { name: "remark", label: "Alert remark", placeholder: "Enter alert message", type: "text", multiline: true, rows: 4 },
                ];

                return <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(1, 1fr)",
                        gap: 2,
                    }}
                >
                    {todoFormField?.map(({ name, label, type, multiline, rows, placeholder }: any) => (
                        <Controller
                            key={name}
                            name={`todoForm.${name}` as any}
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={label}
                                    placeholder={placeholder}
                                    type={type}
                                    size="small"
                                    fullWidth
                                    multiline={multiline}
                                    rows={rows}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value)}
                                />
                            )}
                        />
                    ))}
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        <InfoOutlined fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                            This alert will be displayed in the client list.
                        </Typography>
                    </Box>
                </Box>

            default:
                return null;
        }
    };

    const handleSave = async (props: any = {}) => {
        try {
            let payload: any = {};

            switch (tab) {
                case 'loan_form_tab':
                    const formValues = getValues()?.sectionForm;
                    payload = {
                        loan_sanction_date: formValues.loan_sanction_date ? dayjs(formValues.loan_sanction_date).format("YYYY-MM-DD") : null,
                        first_disbursement_date: formValues.first_disbursement_date ? dayjs(formValues.first_disbursement_date).format("YYYY-MM-DD") : null,
                        first_sale_bill_amount: formValues.first_sale_bill_amount,
                        loan_amount: formValues.loan_amount,
                        disbursement_amount: formValues.disbursement_amount,
                        sanction_amount: formValues.sanction_amount,
                    };
                    break;

                case 'manage_status_tab':
                    const statusValues = getValues()?.statusForm;
                    payload = {
                        status: {
                            scheme_id: selectedSchemeId,
                            stage_id: statusValues?.stage,
                            status_id: statusValues?.status,
                            remarks: statusValues?.remark,
                        }
                    }
                    break;

                case 'manage_stage_tab':
                    const stageValues = getValues()?.stageForm;
                    payload = {
                        stage: {
                            scheme_id: selectedSchemeId,
                            stage_id: stageValues?.stage,
                            end_date: stageValues?.end_date,
                            remarks: stageValues?.remark,
                            default_status_id: statusList?.find((s) => s?.payload?.order_index == 1)?._id // Default status for new stage
                        }
                    }
                    break;

                case 'manage_todo_tab':
                    const { taskCompleted } = props;

                    const todoValues = getValues().todoForm;
                    await updateTodoMutation.mutateAsync({
                        id: caseDetail?.client?._id,
                        payload: {
                            case_todos: {
                                case_id: id,
                                scheme_id: selectedSchemeId,
                                remark: todoValues.remark,
                                taskCompleted: taskCompleted,
                            },
                        },
                        taskCompleted: taskCompleted,
                    });
                    break;
            }

            if (Object.keys(payload)?.length > 0) { await updateMutation.mutateAsync({ id, payload }) }
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] })
            if (tab === 'manage_status_tab') queryClient.invalidateQueries({ queryKey: ['client_status'] })
        } catch (error) {
            console.error(error);
        }
    }

    //#region No case found
    if (!caseDetail || !caseDetail?._id) {
        return (
            <Box sx={{ minHeight: "70vh", display: "flex", justifyContent: "center", alignItems: "center", p: 3 }}>
                <Paper elevation={2} sx={{ maxWidth: 450, width: "100%", p: 5, textAlign: "center", borderRadius: 3, }}>
                    <SearchOff color="disabled" sx={{ fontSize: 70, mb: 2 }} />

                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        No Case Details Found
                    </Typography>

                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                        The requested case could not be found or may have been removed.
                    </Typography>

                    <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                </Paper>
            </Box>
        );
    }
    //#endregion

    return (
        <>
            <Box>
                {AlertComponent}
                <Stack spacing={3}>
                    {!propId && (
                        <PageHeader
                            title="Client Case detail"
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
                            {headerFields?.map((item) => (
                                <Box key={item?.label}>
                                    <Typography variant="caption" color={item?.color || `text.secondary`}>
                                        {item?.label}
                                    </Typography>

                                    {item?.isStatus ?
                                        <Typography fontWeight={600} fontSize={13}>
                                            {item?.value ?
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={item?.value}
                                                    sx={{ bgcolor: `${getColor(item)}`, borderColor: `${getColor(item)}` }}
                                                />
                                                : "-"}
                                        </Typography>
                                        :
                                        <Typography
                                            key={item.label}
                                            fontWeight={600}
                                            fontSize={13}
                                            color={item.color || (item.onclick ? "primary.main" : "text.primary")}
                                            sx={{
                                                textTransform: "capitalize",
                                                cursor: item.onclick ? "pointer" : "default",
                                                "&:hover": item.onclick ? { textDecoration: "underline" } : {},
                                            }}
                                            onClick={item.onclick}
                                        >
                                            {item.value}
                                        </Typography>
                                    }
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
                                        <Typography variant="body2">
                                            {docCount?.totalCount === 0
                                                ? "No Documents"
                                                : docCount?.isAllUploaded
                                                    ? `All ${docCount?.totalCount} Documents Uploaded`
                                                    : `Documents: ${docCount?.uploadedCount ?? 0}/${docCount?.totalCount ?? 0} Uploaded `}
                                        </Typography>

                                        {docCount?.totalCount > 0 && <Tooltip title="View Documents" placement="bottom" arrow>
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

                            <Tooltip
                                arrow
                                placement="top"
                                title={`Completion of the active stage based on status updates`}
                            >
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Progress: ${percentage || 0}%`}
                                    icon={<TrendingUp />}
                                    sx={{ p: 1, color: 'primary.main', cursor: "pointer", borderColor: "primary.main", '& .MuiChip-icon': { color: 'primary.main' } }}
                                />
                            </Tooltip>

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
                                    Status & Progress
                                </Typography>

                                <Stepper activeStep={activeStep} orientation="vertical">
                                    {formattedStatusList.map((status: any, idx) => (
                                        <Step key={status._id}>
                                            <StepLabel
                                                onClick={idx <= activeStatusIndex ? () => setActiveStep(idx) : undefined} sx={{
                                                    cursor: idx <= activeStatusIndex ? "pointer" : "not-allowed",
                                                    opacity: idx <= activeStatusIndex ? 1 : 0.5,
                                                }}
                                            >
                                                <Typography fontWeight={600}>
                                                    {status.payload.label}
                                                </Typography>

                                                {status.statusProgress?.completed_date && (
                                                    <Typography variant="body2" mt={1}>
                                                        {formatDateTime(status.statusProgress.completed_date)}
                                                    </Typography>
                                                )}
                                            </StepLabel>

                                            <StepContent>
                                                <Typography variant="body2">
                                                    {status.statusProgress?.remarks}
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
                                >
                                    <Tabs
                                        value={tab}
                                        onChange={(_, newValue) => setTab(newValue)}
                                        sx={{ width: "100%" }}
                                    >
                                        <Tab value="loan_form_tab" label="Loan Section" sx={{ textTransform: "none" }} />
                                        <Tab value="manage_status_tab" label="Manage Status" sx={{ textTransform: "none" }} />
                                        <Tab value="manage_stage_tab" label="Manage Stage" sx={{ textTransform: "none" }} />
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Tab
                                            value="manage_todo_tab"
                                            icon={<NotificationsActiveOutlined fontSize="small" />}
                                            iconPosition="start"
                                            label="Client Alerts"
                                            sx={{ textTransform: "none", minHeight: 48 }}
                                        />
                                    </Tabs>
                                </Box>

                                <Divider sx={{ mb: 1 }} />
                                <Box component="form" sx={{ width: "500px" }}>
                                    <Box sx={{ marginTop: "20px", marginBottom: "10px", display: "flex", gap: 3, flexDirection: "column" }}>
                                        {renderTabContent()}
                                    </Box>
                                    <Box sx={{ display: "flex", justifyContent: "end", gap: "4px" }}>
                                        <Button
                                            type="button"
                                            variant="contained"
                                            onClick={() =>
                                                tab === "manage_todo_tab"
                                                    ? handleSave({ taskCompleted: false })
                                                    : handleSave()
                                            }
                                        >
                                            Save
                                        </Button>
                                        {tab === "manage_todo_tab" && clientTodoRemark && (
                                            <Tooltip title="Remove alert from client">
                                                <Button
                                                    type="button"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckCircle />}
                                                    onClick={() => handleSave({ taskCompleted: true })}
                                                >
                                                    Completed
                                                </Button>
                                            </Tooltip>
                                        )}

                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Stack>
            </Box>

            <AppDrawer open={Boolean(documentMode)} onClose={() => setDocumentMode(null)} title={`${documentMode == "edit" ? "Edit" : "View"} Document`} anchor="right" width={600}>
                <DocumentManager
                    caseDetail={caseDetail}
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
                            {docCount?.requiredDocs?.map((docId: string, index: number) => {
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
                                            checked={submittedDocs?.some((doc: any) => doc?.scheme_id == selectedSchemeId && doc?.docId == docId)}
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

            {selecteClientId && (
                <ClientDetailDrawer
                    open={Boolean(selecteClientId)}
                    onClose={() => setSelecteClientId(null)}
                    clientId={selecteClientId}
                />
            )}
        </>
    );
}