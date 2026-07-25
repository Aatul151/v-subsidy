import { useEffect, useMemo, useState } from "react";
import { ArrowBack, Assignment, DescriptionOutlined, TrendingUp, Visibility, Close as CloseIcon, DescriptionOutlined as DescriptionOutlinedIcon, CheckCircle, SearchOff, InfoOutlined, NotificationsActiveOutlined, CancelOutlined, NotificationsNone } from "@mui/icons-material";
import { Box, Button, Card, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Paper, Stack, Step, StepIcon, StepLabel, Stepper, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
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
import { SearchableSelect } from "@/components/common/SearchableSelect";

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
                first_sale_bill_amount_date: null as Dayjs | null,
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
                start_date: null as Dayjs | null,
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

    const { data: clientSubsidydetail, isLoading, isFetching } = useQuery({
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
        enabled: !!clientId && !caseDetail?.isArchived,
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

    const activeStatusIndex = formattedStatusList.findIndex((item: any) => !item.statusProgress?.is_skipped && item?._id == currentStatus?.status_id);

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
                ...getFormValues(),
            });
        }
    }, [caseDetail, reset, selectedSchemeId]);

    useEffect(() => {
        reset({
            ...getValues(),
            ...getFormValues()
        });
    }, [currentStage, currentStatus, caseDetail]);

    const getFormValues = () => ({
        sectionForm: {
            loan_sanction_date: caseDetail?.loan_sanction_date ? dayjs(caseDetail.loan_sanction_date) : null,
            first_disbursement_date: caseDetail?.first_disbursement_date ? dayjs(caseDetail.first_disbursement_date) : null,
            first_sale_bill_amount_date: caseDetail?.first_sale_bill_amount_date ? dayjs(caseDetail.first_sale_bill_amount_date) : null,
            loan_amount: caseDetail?.loan_amount || "",
            disbursement_amount: caseDetail?.disbursement_amount || "",
            sanction_amount: caseDetail?.sanction_amount || "",
        },

        statusForm: {
            stage: currentStage?.stage_id || "",
            status: currentStatus?.status_id || "",
            remark: currentStatus?.remarks || "",
        },

        stageForm: {
            stage: currentStage?.stage_id || "",
            start_date: currentStage?.start_date ? dayjs(currentStage.start_date) : null,
            end_date: currentStage?.end_date ? dayjs(currentStage.end_date) : null,
            remark: currentStage?.remarks || "",
        },

        todoForm: {
            remark: clientTodoRemark || "",
        },
    });

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

    const formateSchemeOption = clientScheme?.map((s: any) => { return { label: `${s?.ref_scheme?.scheme_name} - ${s?.case_number}`, value: s?._id } })
    const actionButton = (
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!caseDetail?.isArchived && clientScheme?.length > 1 && (
                <SearchableSelect
                    label="Select Scheme"
                    value={formateSchemeOption?.find((item: any) => item?.value == id)?.value || null}
                    onChange={(value: any) => {
                        if (value) {
                            // field.onChange(value);
                            navigate(`/client-case/${value}`);
                        }
                    }}
                    options={formateSchemeOption}
                    emptyText="No fields available"
                    placeholder="Search scheme..."
                />
            )}

            <Tooltip title="Go Back" placement="bottom" arrow>
                <Button
                    size="small"
                    onClick={() => { navigate(`/client-case`) }}
                    variant={'contained'}
                    color="primary"
                >
                    <ArrowBack />
                </Button>
            </Tooltip>
        </Box>
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
        setValue("stageForm.start_date", fieldValue?.start_date ? dayjs(fieldValue?.start_date) : null);
    };

    const resetCurrentTab = (tab: string) => {
        const values = getFormValues();

        switch (tab) {
            case "loan_form_tab":
                setValue("sectionForm", values.sectionForm);
                break;

            case "manage_status_tab":
                setValue("statusForm", values.statusForm);
                break;

            case "manage_stage_tab":
                setValue("stageForm", values.stageForm);
                break;

            case "manage_todo_tab":
                setValue("todoForm", values.todoForm);
                break;
        }
    };

    const handleTabChange = (_: any, newTab: string) => {
        resetCurrentTab(tab);
        setTab(newTab);
    };

    const renderTabContent = () => {
        const formateStageList = stageList?.map((stg) => { return { value: stg?._id, label: stg?.payload?.name } })
        const formateStatusList = statusList?.map((stg) => { return { value: stg?._id, label: stg?.payload?.label } })

        switch (tab) {
            case "loan_form_tab":
                const formFields = [
                    { name: "loan_sanction_date", label: "Loan Sanction Date", type: "date" },
                    { name: "first_disbursement_date", label: "First Disbursement Date", type: "date" },
                    { name: "first_sale_bill_amount_date", label: "First Sale Bill Amount Date", type: "date" },
                    { name: "loan_amount", label: "Loan Amount", type: "number" },
                    { name: "disbursement_amount", label: "Disbursement Amount", type: "number" },
                    { name: "sanction_amount", label: "Sanction Amount", type: "number" }
                ];
                const values = getValues().sectionForm;
                const hasValue = Object.values(values)?.some((value) => value !== null && value !== undefined && value !== "");

                return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
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
                        <Box sx={{ display: "flex", justifyContent: "start" }}>
                            <Button type="button" variant="contained" disabled={caseDetail?.isArchived || !hasValue} onClick={() => { handleSave(); }} >
                                Save
                            </Button>
                        </Box>
                    </Box>
                );

            case "manage_status_tab":
                const statusFormField = [
                    { name: "status", label: "Status", type: "dropdown", options: formateStatusList, onChange: (value: string) => handleStatusChange(value) },
                    { name: "stage", label: "Stage", type: "dropdown", options: formateStageList, disabled: true },
                    { name: "remark", label: "Remark", type: "text", multiline: true, rows: 4 },
                ];
                const status_formValues = getValues().statusForm;
                const hasStatusValue = Object.values(status_formValues).some((value) => value !== null && value !== undefined && value !== "");

                return <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 2
                        }}
                    >
                        {statusFormField?.map(({ name, label, type, options, disabled = false, multiline, rows, onChange }: any) => (
                            <Controller
                                key={name}
                                name={`statusForm.${name}` as any}
                                control={control}
                                render={({ field }) =>
                                    type === "dropdown" ? (
                                        <SearchableSelect
                                            label={label}
                                            multiple={false}
                                            value={field.value}
                                            options={options}
                                            disabled={disabled}
                                            placeholder={`Search ${label}...`}
                                            emptyText="No results found"
                                            onChange={(value: any) => {
                                                field.onChange(value);
                                                onChange?.(value)
                                            }}
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
                                            sx={{
                                                "& .MuiInputBase-inputMultiline": {
                                                    resize: "vertical",
                                                },
                                            }}
                                        />
                                    )
                                }
                            />
                        ))}
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "start" }}>
                        <Button type="button" variant="contained" disabled={caseDetail?.isArchived || !hasStatusValue} onClick={() => { handleSave(); }}>
                            Save
                        </Button>
                    </Box>
                </Box>
            case "manage_stage_tab":
                const stageFormField = [
                    { name: "stage", label: "Stage", type: "dropdown", options: formateStageList, onChange: (value: string) => handleStageChange(value) },
                    { name: "start_date", label: "Start date", type: "date" },
                    { name: "remark", label: "Remark", type: "text", multiline: true, rows: 4 },
                    { name: "end_date", label: "End date", type: "date" },

                ];
                const stage_formValues = getValues().stageForm;
                const hasStageValue = Object.values(stage_formValues).some((value) => value !== null && value !== undefined && value !== "");

                const startDate = watch("stageForm.start_date");
                const endDate = watch("stageForm.end_date");

                return <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
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
                                            <SearchableSelect
                                                label={label}
                                                multiple={false}
                                                value={field.value}
                                                options={options}
                                                disabled={disabled}
                                                placeholder={`Search ${label}...`}
                                                emptyText="No results found"
                                                onChange={(value: any) => {
                                                    field.onChange(value);
                                                    onChange?.(value)
                                                }}
                                            />
                                        ) : type === "date" ? (
                                            <DatePicker
                                                label={label}
                                                value={field.value}
                                                format="DD/MM/YYYY"
                                                minDate={name === "end_date" ? startDate : undefined}
                                                maxDate={name === "start_date" ? endDate : undefined}
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
                                                sx={{
                                                    "& .MuiInputBase-inputMultiline": {
                                                        resize: "vertical",
                                                    },
                                                }}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            />
                                        )
                                    }
                                />
                            ))}
                        </LocalizationProvider>

                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "start" }}>
                        <Button type="button" variant="contained" disabled={caseDetail?.isArchived || !hasStageValue} onClick={() => { handleSave(); }}>
                            Save
                        </Button>
                    </Box>
                </Box>
            case "manage_todo_tab":
                const todoFormField = [
                    { name: "remark", label: "Alert remark", placeholder: "Enter alert message", type: "text", multiline: true, rows: 4 },
                ];

                const todoValues = getValues().todoForm;
                return <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
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
                                        sx={{
                                            "& .MuiInputBase-inputMultiline": {
                                                resize: "vertical",
                                            },
                                        }}
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
                    <Box sx={{ display: "flex", justifyContent: "start", gap: "4px" }}>
                        <Button
                            type="button"
                            variant="contained"
                            disabled={caseDetail?.isArchived || !todoValues?.remark?.trim() || updateTodoMutation.isPending}
                            onClick={() => { handleSave({ taskCompleted: todoValues.remark ? false : true }); }}
                        >
                            Save
                        </Button>
                        {clientTodoRemark && (
                            <Tooltip title="Mark as complete">
                                <Button
                                    type="button"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    onClick={() => handleSave({ taskCompleted: true })}
                                >
                                    Complete
                                </Button>
                            </Tooltip>
                        )}
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
                        first_sale_bill_amount_date: formValues.first_sale_bill_amount_date ? dayjs(formValues.first_sale_bill_amount_date).format("YYYY-MM-DD") : null,
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
                            start_date: stageValues?.start_date,
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
            if (tab === 'manage_status_tab' || tab === "manage_stage_tab") queryClient.invalidateQueries({ queryKey: ['client_status'] })
        } catch (error) {
            console.error(error);
        }
    }

    //#region

    // loader while API is loading for fetch case details
    if (isLoading) {
        return (
            <Box sx={{ minHeight: "70vh", display: "flex", justifyContent: "center", alignItems: "center", bgcolor: "background.default" }}>
                <Paper
                    elevation={0}
                    sx={{ px: 5, py: 4, textAlign: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", minWidth: 280 }}
                >
                    <CircularProgress size={36} thickness={4} />
                    <Typography variant="h6" fontWeight={600} sx={{ mt: 2 }}>
                        Loading Case Details
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Please wait while we fetch the latest information...
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // No case found
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
                {(isFetching || updateTodoMutation.isPending) && (<LinearProgress sx={{ position: "sticky", top: 0 }} />)}
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
                                    {formattedStatusList.map((status: any, idx) => {
                                        const progress = status?.statusProgress;
                                        const isExplicitSkipped = progress && progress.is_skipped === true && progress.completed_date === null;
                                        const isMissingProgressPastActive = !progress && idx < activeStep;
                                        const showCrossIcon = isExplicitSkipped || isMissingProgressPastActive;
                                        return (
                                            <Step key={status._id}>
                                                <StepLabel
                                                    StepIconComponent={(props) => {
                                                        if (showCrossIcon) { return <CancelOutlined color="error" /> }
                                                        return <StepIcon {...props} />;
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

                                                    {/* Always show remarks */}
                                                    {progress?.remarks && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            mt={0.5}
                                                        >
                                                            {progress.remarks}
                                                        </Typography>
                                                    )}
                                                </StepLabel>
                                            </Step>
                                        )
                                    })}
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
                                        // onChange={(_, newValue) => setTab(newValue)}
                                        onChange={handleTabChange}
                                        sx={{ width: "100%" }}
                                    >
                                        <Tab value="loan_form_tab" label="Loan Section" sx={{ textTransform: "none" }} />
                                        <Tab value="manage_status_tab" label="Manage Status" sx={{ textTransform: "none" }} />
                                        <Tab value="manage_stage_tab" label="Manage Stage" sx={{ textTransform: "none" }} />
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Tab
                                            value="manage_todo_tab"
                                            icon={clientTodoRemark ? <NotificationsActiveOutlined fontSize="small" /> : <NotificationsNone fontSize="small" />}
                                            iconPosition="start"
                                            color="warning"
                                            label="Client Alert"
                                            sx={{ textTransform: "none", minHeight: 48 }}
                                        />
                                    </Tabs>
                                </Box>

                                <Divider sx={{ mb: 1 }} />
                                <Box component="form">
                                    <Box sx={{ marginTop: "20px", marginBottom: "10px", display: "flex", gap: 1, flexDirection: "column" }}>
                                        {renderTabContent()}
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

                        <Button disabled={caseDetail?.isArchived} variant="contained" color="primary" onClick={() => handleSaveDocuments()}>
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