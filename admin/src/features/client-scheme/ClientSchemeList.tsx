import { Alert, Avatar, Box, Button, ButtonGroup, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import { FormatListBulleted as FormatListBulletedIcon } from '@mui/icons-material';
import { GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Add as AddIcon, GridView as GridViewIcon, Edit as EditIcon, Refresh as RefreshIcon, Visibility as ViewIcon, Delete as DeleteIcon, } from '@mui/icons-material';
import { useEffect, useState } from "react";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { AppDataTable } from "@/components/common/AppDataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContent } from "@/components/common/PageContent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime, SYSTEM_FORM_NAMES, transformFormSchema } from "@/utils/formUtils";
import { formEntriesAPI, formsAPI } from "@/api/forms";
import { FormField, FormSection } from "@aatulwork/customform-renderer";
import { clientSubsidyAPI, ClientSubsidyType, CreateClientPayload, UpdateClientSubsidyPayload } from "@/api/clientSubsidy";
import { FormContainer } from "@/components/form-builder/FormContainer";
import { useAppAlert } from "@/components/common/AppAlert";
import { clientsAPI } from "@/api/manageClient";
import { usersAPI } from "@/api/users";
import utc from "dayjs/plugin/utc";
import { getAvatarColor } from "@/utils/iconMap";
import { STATUS_LIST } from "@/utils/types";

dayjs.extend(utc);

export default function ClientScheme() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showAlert, AlertComponent } = useAppAlert();
    const [searchParams, setSearchParams] = useSearchParams();

    const statusParam = searchParams.get('status');
    const expiredParam = searchParams.get('expired');

    const [formDrawerOpen, setFormDrawerOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedClientSubsidy, setSelectedClientSubsidy] = useState<ClientSubsidyType | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [OpenArchiveTable, setOpenArchiveTable] = useState(false);
    const [isKanbanBoard, setIsKanbanBoard] = useState(false);
    const [pages, setPages] = useState<any>(1);
    const [skip, setSkip] = useState<any>();
    const [allClientSubsidy, setAllClientSubsidy] = useState<any[]>([]);
    const [defaultSubsidyCount, setDefaultSubsidyCount] = useState<any>(null);
    const [filterStage, setFilterStage] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    const { control, watch, reset } = useForm({
        defaultValues: {
            client: [],
            stage: [],
            assigned_executive: [],
            status: statusParam ? [statusParam] : [],
            date: expiredParam === "true" ? "expired" : "",
            startDate: null as Dayjs | null,
            endDate: null as Dayjs | null,
        },
    });

    const { client, stage, assigned_executive, date, startDate, endDate, status }: any = watch();

    const getDateRange = () => {
        const today = dayjs();
        switch (date) {
            case "today":
                return {
                    expireFrom: dayjs().startOf("day").format("YYYY-MM-DD"),
                    expireTo: dayjs().endOf("day").format("YYYY-MM-DD")
                };

            case "week":
                return {
                    expireFrom: dayjs().add(1, "day").format("YYYY-MM-DD"),
                    expireTo: dayjs().add(7, "day").format("YYYY-MM-DD")
                };

            case "month":
                return {
                    expireFrom: today.startOf("month").format("YYYY-MM-DD"),
                    expireTo: today.endOf("month").format("YYYY-MM-DD")
                };

            case "custom":
                return {
                    expireFrom: startDate?.format("YYYY-MM-DD"),
                    expireTo: endDate?.format("YYYY-MM-DD")
                };

            default:
                return {};
        }
    };

    const dateRange = getDateRange();

    const {
        data: formSchemaRaw,
        isLoading: formDefLoading,
        error: formDefError
    } = useQuery({
        queryKey: ['formDefinition', SYSTEM_FORM_NAMES.CASE],
        queryFn: async () => {
            try {
                const form = await formsAPI.getByName(SYSTEM_FORM_NAMES.CASE);
                return transformFormSchema(form);
            } catch (error: any) {
                console.error('Error fetching role form:', error);
                throw error;
            }
        },
        retry: 1,
    });

    const { data: clientList } = useQuery({
        queryKey: ['manage-clients'],
        queryFn: async () => { return await clientsAPI.getAll(1, 10) },
        placeholderData: (previousData) => previousData,
    });

    const { data: userList, } = useQuery({
        queryKey: ['users'],
        queryFn: async () => { return await usersAPI.getAll(1, 10); },
        placeholderData: (previousData) => previousData,
    });

    const { data: statusList = [] as any } = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.APPLICABLE_STATUS],
        queryFn: async () => {
            try {
                const response = await formEntriesAPI.getAll({
                    formName: SYSTEM_FORM_NAMES.APPLICABLE_STATUS,
                    page: 1,
                    limit: 10,
                });
                return response.data || [];
            } catch (error) {
                return [];
            }
        },

    });

    const formSchema = formSchemaRaw;

    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    const page = paginationModel.page;
    const pageSize = paginationModel.pageSize;

    const filters = {
        client: Array.isArray(client) ? client?.join(",") : client,
        status: Array.isArray(status) ? status?.join(",") : status,
        expired: date === "expired" ? true : null,
        assigned_executive: Array.isArray(assigned_executive) ? assigned_executive?.join(",") : assigned_executive,
        skip: skip && isKanbanBoard && isExpanded ? skip : undefined,
        ...(isKanbanBoard ? (isExpanded ? { current_stage: filterStage } : {}) : { current_stage: Array.isArray(stage) ? stage.join(",") : stage }),
        ...(OpenArchiveTable && { isArchived: true }),
        ...dateRange,
    };

    const currentPage = isKanbanBoard && isExpanded ? pages : page + 1;
    const currentLimit = isKanbanBoard ? 100 : pageSize;

    const {
        data: clientSubsidyList,
        isLoading: clientLoading,
    } = useQuery({
        queryKey: [
            'client_subsidy',
            isKanbanBoard ? 'kanban' : 'table',
            currentPage,
            currentLimit,
            filters,
        ],
        queryFn: async () => {
            return await clientSubsidyAPI.getAll({
                page: currentPage,
                limit: currentLimit,
                filters,
            });
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });

    useEffect(() => {
        const isClientFilterEmpty = !client || client.length === 0;
        const isDateFilterApplied = !!date && date !== "";
        const isUserFilterEmpty = !assigned_executive || assigned_executive.length === 0;
        const isStatusFilterEmpty = !status || status.length === 0;

        // 1. Get the current active date strings from your helper function
        const activeRange = isDateFilterApplied ? getDateRange() : null;

        if (!filterStage && isClientFilterEmpty && isUserFilterEmpty && isStatusFilterEmpty && !isDateFilterApplied && clientSubsidyList?.pagination) {
            setDefaultSubsidyCount(clientSubsidyList.pagination);
        } else {
            const updatedStages = clientSubsidyList?.pagination?.stageCounts || [];

            setDefaultSubsidyCount((prev: any) => {
                if (updatedStages.length === 0) { return { ...prev, stageCounts: [] }; }

                const stageMap = new Map();
                // 2. Combined validation helper for client, dates, and executive users
                const isValidStage = (s: any) => {
                    // Check client matches EXACTLY if filtered
                    const matchesClient = isClientFilterEmpty || (
                        Array.isArray(s.client)
                            ? s.client.length === client.length && s.client.every((id: string) => client?.includes(id))
                            : client.includes(s.client)
                    );
                    // Check dates match if date filter is active
                    const matchesDate = !isDateFilterApplied || (
                        s.expireFrom === activeRange?.expireFrom &&
                        s.expireTo === activeRange?.expireTo
                    );

                    // FIX: Check assigned_executive filter strictly 
                    const matchesUser = isUserFilterEmpty || (
                        s.assigned_executive && (
                            Array.isArray(s.assigned_executive)
                                ? s.assigned_executive.length === assigned_executive.length && s.assigned_executive.every((id: string) => assigned_executive?.includes(id))
                                : assigned_executive.includes(s.assigned_executive)
                        )
                    );
                    const matchesStatus = isStatusFilterEmpty || (
                        Array.isArray(s.status)
                            ? s.status.length === status.length && s.status.every((st: string) => status?.includes(st))
                            : status.includes(s.status)
                    );

                    return matchesClient && matchesDate && matchesUser && matchesStatus;
                };
                // 3. Filter existing state and incoming data with the unified rule
                const existingStages = (prev?.stageCounts || []).filter(isValidStage);
                const incomingStages = updatedStages.filter(isValidStage);
                // 4. Merge data fields cleanly
                [...existingStages, ...incomingStages].forEach((stage: any) => {
                    stageMap.set(stage.stageId, {
                        ...stageMap.get(stage.stageId),
                        ...stage
                    });
                });
                return {
                    ...prev,
                    stageCounts: Array.from(stageMap.values())
                };
            });
        }
    }, [clientSubsidyList, filterStage, client, date, startDate, endDate, assigned_executive]);
    const clientSubsidy = clientSubsidyList?.data || [];
    const clientSubsidyPagination = clientSubsidyList?.pagination as any;

    useEffect(() => {
        if (isKanbanBoard) {
            if (clientSubsidy && isExpanded) {
                setAllClientSubsidy((prev) => {
                    const merged = [
                        ...prev,
                        ...clientSubsidy?.filter(
                            (newItem: any) =>
                                !prev.some(
                                    (oldItem: any) =>
                                        oldItem._id === newItem._id
                                )
                        ),
                    ];
                    return merged;
                });
            } else {
                setAllClientSubsidy(clientSubsidy);
            }
        }
    }, [clientSubsidy]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (payload: CreateClientPayload) => clientSubsidyAPI.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] });
            showAlert('success', 'Case added successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to create case');
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateClientSubsidyPayload }) =>
            clientSubsidyAPI.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] });
            showAlert('success', 'Case updated successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to update case');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (clientSubsidyId: string) => clientSubsidyAPI.delete(clientSubsidyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] });
            showAlert('success', 'Case archived successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to delete case');
        },
    });

    const handleActions = (drawerOpen: boolean, client: any, type: typeof formMode) => {
        setFormDrawerOpen(drawerOpen);
        setFormMode(type);
        setSelectedClientSubsidy(client)
    }

    const handleDelete = async (client: ClientSubsidyType) => {
        setDeleteDialogOpen(true);
        setSelectedClientSubsidy(client);
    }

    const confirmDelete = () => {
        if (selectedClientSubsidy?._id) {
            deleteMutation.mutateAsync(selectedClientSubsidy._id);
        }
        setDeleteDialogOpen(false);
    }

    const handleFormSubmit = async (data: Record<string, any>) => {
        const payload = {
            client: data?.client,
            subsidy: data?.subsidy,
            assigned_executive: data?.assigned_executive,
            current_stage: data?.current_stage,
            expireOn: dayjs(data.expireOn).format("YYYY-MM-DD"),
            remarks: data?.remarks,
            status: data?.status
        }
        if (formMode == 'edit' && selectedClientSubsidy?._id) {
            await updateMutation.mutateAsync({ id: selectedClientSubsidy._id, payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
    };
    const orderMap: Record<string, number> = {
        client: 1,
        case_number: 2,
        subsidy: 3,
        expireOn: 4,
        current_stage: 5,
        status: 5,
        assigned_executive: 6,
        remarks: 8,
    };

    // Build columns dynamically from form schema
    const buildColumns = (): GridColDef[] => {
        if (!formSchema) {
            // Fallback columns if form schema is not loaded
            return [
                { field: 'client', headerName: 'client', width: 200 },
                { field: 'subsidy', headerName: 'subsidy', flex: 1, minWidth: 150 },
                { field: 'stage', headerName: 'stage', flex: 1, minWidth: 150 },
            ];
        }
        const columns: (GridColDef & { order?: number })[] = [];

        // Get all fields from sections
        const allFields = formSchema.sections
            ? formSchema.sections.flatMap((section: FormSection) => section.fields)
            : formSchema.fields || [];

        // Add columns for each field
        allFields.forEach((field: FormField) => {
            if (field.name.toLowerCase() === 'client') {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 200,
                    order: orderMap.client,
                    renderCell: (params: any) => {
                        const clientName = params?.row?.client?.name;
                        return <>
                            <Avatar sx={{ width: 25, height: 25, mr: 1, bgcolor: `${getAvatarColor(clientName)}.light`, }}>
                                {clientName?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            {clientName}
                        </>
                    },
                    valueGetter: (_value, row: any) => { return row?.client?.name; }
                });
            } else if (field.name.toLowerCase() === 'subsidy') {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 200,
                    order: orderMap.subsidy,
                    renderCell: (params: any) => {
                        const expireDate = new Date(params?.row?.expireOn);
                        const today = new Date();
                        expireDate.setUTCHours(0, 0, 0, 0);
                        today.setUTCHours(0, 0, 0, 0);
                        const isExpired = expireDate.getTime() < today.getTime();
                        return (
                            <Box sx={{ color: isExpired ? "#e71d3b" : "", }}  >
                                {params?.row?.subsidy_ref?.subsidy_name}
                            </Box>
                        );
                    },
                    valueGetter: (_value, row: any) => row?.subsidy_ref?.subsidy_name
                });
            } else if (field.name.toLowerCase() === "current_stage") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 250,
                    order: orderMap.current_stage,
                    renderCell: (params: any) => {
                        const stage = params?.row?.current_stage_ref?.label;
                        const bgColor = params?.row?.current_stage_ref?.bgColor;
                        return (
                            <Chip
                                label={stage || "-"}
                                size="small"
                                sx={{
                                    backgroundColor: bgColor,
                                }}
                            />
                        );
                    },
                    valueGetter: (_value, row: any) => { return row?.current_stage_ref?.label; }
                });
            } else if (field.name.toLowerCase() === "assigned_executive") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 200,
                    order: orderMap.assigned_executive,
                    valueGetter: (_value, row: any) => { return row?.assigned_executive_ref?.name; }
                });
            } else if (field.name === "expireOn") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    headerAlign: "center",
                    width: 200,
                    order: orderMap.expireOn,
                    renderCell: (params: any) => {
                        const expireDate = new Date(params?.row?.expireOn);
                        const today = new Date();
                        expireDate.setUTCHours(0, 0, 0, 0);
                        today.setUTCHours(0, 0, 0, 0);
                        const isExpired = expireDate.getTime() < today.getTime();
                        return (
                            <Box sx={{ color: isExpired ? "#e71d3b" : "", width: "100%", textAlign: "center" }}  >
                                {formatDateTime(params?.row?.expireOn, { datePickerMode: 'date' })}
                            </Box>
                        );
                    },
                    valueGetter: (_value, row: any) => {
                        return formatDateTime(row?.expireOn, { datePickerMode: 'date' });
                    }
                });
            } else if (field.name.toLowerCase() === "remarks") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 250,
                    order: orderMap.remarks,
                    valueGetter: (_value, row: any) => { return row?.remarks; }
                });
            } else if (field.name === "status") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 200,
                    order: orderMap.status,
                    renderCell: (params: any) => {
                        const status = params?.row?.status;
                        return status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
                    },
                    valueGetter: (_value, row: any) => { return row?.status; }
                });
            } else {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    flex: 1,
                    minWidth: 150,
                    valueGetter: (_value, row: ClientSubsidyType) => {
                        const fieldValue = row[field.name];
                        if (fieldValue === null || fieldValue === undefined) return '';
                        if (typeof fieldValue === 'object') return JSON.stringify(fieldValue);
                        return String(fieldValue);
                    },
                });
            }
        });

        // Add metadata columns
        columns.push(
            {
                field: 'case_number',
                headerName: 'Case Number',
                order: orderMap.case_number,
                width: 180,
                renderCell: (params) => {
                    return (<>
                        <Tooltip title="View Client Subsidy Detail" placement="bottom" arrow>
                            <Button sx={{ textTransform: "capitalize" }} onClick={() => { navigate(`/client-case/${params?.row?._id}`) }}>{params?.row?.case_number}</Button>
                        </Tooltip >
                    </>)
                },
                valueGetter: (_value, row: any) => { return row?.case_number; }
            },
            {
                field: 'actions',
                type: 'actions',
                headerName: 'Actions',
                width: 250,
                getActions: (params) => [
                    <GridActionsCellItem
                        key="view"
                        icon={<ViewIcon />}
                        label="View"
                        onClick={() => handleActions(true, params.row, 'view')}
                    />,
                    ...(!OpenArchiveTable
                        ? [
                            <GridActionsCellItem
                                key="edit"
                                icon={<EditIcon />}
                                label="Edit"
                                onClick={() => handleActions(true, params.row, 'edit')}
                            />,
                            <GridActionsCellItem
                                key="delete"
                                icon={<DeleteIcon color="error" />}
                                label="Delete"
                                onClick={() => handleDelete(params.row)}
                            />
                        ]
                        : [])
                ],
            }
        );
        return columns.sort((a, b) => (a.order || 999) - (b.order || 999));
    };

    const columns = buildColumns();

    if (formDefLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (formDefError) {
        const errorMessage = formDefError instanceof Error
            ? formDefError.message
            : (formDefError as any)?.response?.data?.message || 'Failed to load role form definition';

        return (
            <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        Client Subsidy Form Definition Not Found
                    </Typography>
                    <Typography variant="body2">
                        {errorMessage}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.CASE}</strong>
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!formSchema) {
        return (
            <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Client Subsidy form definition not found. Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.CASE}</strong>
                </Alert>
            </Box>
        );
    }

    const isLoading = createMutation.isPending || deleteMutation.isPending;

    const actionButtons = (
        <>
            {!isKanbanBoard && <Button
                variant="outlined"
                size={'small'}
                onClick={() => setOpenArchiveTable((prev) => !prev)}
                sx={{ backgroundColor: OpenArchiveTable ? 'primary.main' : 'transparent', color: OpenArchiveTable ? 'primary.contrastText' : 'primary.main' }}
            >
                {OpenArchiveTable && <>View All Items <CloseIcon fontSize="small" sx={{ ml: 1 }} /></>}
                {!OpenArchiveTable && <>View Archived Items<ViewIcon fontSize="small" sx={{ ml: 1 }} /></>}
            </Button>}
            {!OpenArchiveTable && <ButtonGroup
                variant="outlined"
                size={'small'}
                sx={{ '& .MuiButtonGroup-grouped': { minWidth: 'auto', padding: '5px 10px' } }}
            >
                <Tooltip title="Refresh" placement="bottom" arrow>
                    <Button
                        onClick={() => { queryClient.invalidateQueries({ queryKey: ['client_subsidy'] }) }}
                        disabled={isLoading}
                    >
                        <RefreshIcon fontSize="small" />
                    </Button>
                </Tooltip>
                <Tooltip title={isKanbanBoard ? "Table View" : "Kanban Board"} placement="bottom" arrow>
                    <Button onClick={() => setIsKanbanBoard((prev) => !prev)}>
                        {isKanbanBoard ? <FormatListBulletedIcon /> : <GridViewIcon />}
                    </Button>
                </Tooltip>
                <Tooltip title="Add" placement="bottom" arrow>
                    <Button
                        onClick={() => handleActions(true, null, 'add')}
                        disabled={isLoading}
                        color="primary"
                        sx={{
                            backgroundColor: (theme) => theme.palette.primary.main,
                            color: (theme) => theme.palette.primary.contrastText,
                            borderColor: (theme) => theme.palette.primary.main,
                            '&:hover': {
                                backgroundColor: (theme) => theme.palette.primary.dark,
                                borderColor: (theme) => theme.palette.primary.dark,
                            },
                            '&.Mui-disabled': {
                                backgroundColor: (theme) => theme.palette.action.disabledBackground,
                                borderColor: (theme) => theme.palette.action.disabled,
                            },
                        }}
                    >
                        <AddIcon fontSize="small" />
                    </Button>
                </Tooltip>
            </ButtonGroup>
            }
        </>
    );

    const boardData = (statusList || [])?.map((data: any) => {
        const stageCountObj = defaultSubsidyCount?.stageCounts?.find((e: any) => e?.stageId == data?._id);
        return ({
            _id: data?._id,
            label: data?.payload?.label,
            value: data?.payload?.value,
            bgColor: data?.payload?.bgColor,
            orderIndex: data?.payload?.order_index,

            data: (allClientSubsidy || [])
                ?.filter((item: any) => item?.current_stage == data?._id)
                ?.map((item: any) => ({
                    id: item?._id,
                    title: item?.subsidy_ref?.subsidy_name,
                    description: item?.subsidy_ref?.description,
                    person: item?.client?.name,
                    createdAt: item?.createdAt,
                    current_stage: item?.current_stage,
                    case_number: item?.case_number,
                    expireOn: dayjs.utc(item?.expireOn).format("DD-MMM-YYYY"),
                    totalRequirdDocs: item?.subsidy_ref?.requird_docs?.length
                })),

            pagination: {
                hasNextPage: stageCountObj?.hasNextPage,
                nextPage: stageCountObj?.nextPage,
                stageId: stageCountObj?.stageId,
                totalCount: stageCountObj?.totalCount,
                loadedCount: stageCountObj?.loadedCount,
            }
        })
    }).sort((a: any, b: any) => a?.orderIndex - b?.orderIndex);

    const handleSeeMore = (data: any) => {
        setIsExpanded(true);
        setFilterStage(data?._id);
        setPages(data?.pagination?.nextPage)
        setSkip(data?.pagination?.loadedCount)
    }

    const handleRefresh = (data: any) => {
        setIsExpanded(true);
        setPages(1);
        setSkip(data?.pagination?.loadedCount)
        setFilterStage(data?._id);
    }

    const handleDrop = async (data: any) => {
        const payload = { current_stage: data?.stage }
        // Move card locally
        setAllClientSubsidy(prev =>
            prev.map(item =>
                item._id === data.row.id
                    ? { ...item, current_stage: data.stage }
                    : item
            )
        );
        //update total count
        setDefaultSubsidyCount((prev: any) => ({
            ...prev,
            stageCounts: prev.stageCounts.map((item: any) => ({
                ...item,
                totalCount:
                    item.stageId === data.row.current_stage
                        ? item.totalCount - 1
                        : item.stageId === data?.stage
                            ? item.totalCount + 1
                            : item.totalCount
            }))
        }));

        await updateMutation.mutateAsync({ id: data?.row?.id, payload });
    }

    const handleClose = () => {
        setSearchParams({});
        reset({
            client: [],
            // stage: [],
            assigned_executive: [],
            status: [],
            date: "",
            startDate: null as Dayjs | null,
            endDate: null as Dayjs | null,
        });
        setIsExpanded(false);
        setFilterStage('');
        setPages(1);
        setSkip('');
    };

    return (<>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
            }}
        >
            <PageHeader
                title={OpenArchiveTable ? "Archive Data" : "Cases"}
                icon="FormatListBulleted"
                fallbackIcon={FormatListBulletedIcon}
                sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
                actions={actionButtons}
            />

            {AlertComponent}

            <PageContent>
                <Box sx={{ position: "relative" }}>
                    {!OpenArchiveTable &&
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                                alignItems: "center",
                                width: { xs: isKanbanBoard ? "100%" : "20%", sm: isKanbanBoard ? "100%" : "60%", md: isKanbanBoard ? "100%" : "70%" },
                                justifyContent: { xs: "flex-start", sm: "flex-end", md: "flex-start" },
                            }}
                        >
                            <Controller
                                name="client"
                                control={control}
                                render={({ field }) => (
                                    <FormControl sx={{ width: 200 }} size="small">
                                        <InputLabel id="client-label">Client </InputLabel>
                                        <Select
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (isKanbanBoard) { setPages(1); }
                                                setIsExpanded(false);
                                            }}
                                            multiple={true}
                                            labelId="client-label"
                                            label="Client"
                                        >
                                            {[...new Map(clientList?.data?.map((r: any) => [r?._id, { label: r?.name, id: r?._id }])).values()]
                                                .map((stage: any) => (<MenuItem key={stage?.id} value={stage?.id} > {stage?.label}  </MenuItem>))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                            {!isKanbanBoard && <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <FormControl sx={{ width: 200 }} size="small">
                                        <InputLabel id="status-label">  Status  </InputLabel>
                                        <Select
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (isKanbanBoard) { setPages(1); }
                                                setIsExpanded(false);
                                                setFilterStage('');
                                            }}
                                            multiple={true}
                                            labelId="status-label"
                                            label="status"
                                        >
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
                            />}
                            <Controller
                                name="assigned_executive"
                                control={control}
                                render={({ field }) => (
                                    <FormControl sx={{ width: 200 }} size="small">
                                        <InputLabel id="client-label">Assign Executive </InputLabel>
                                        <Select
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (isKanbanBoard) { setPages(1); }
                                                setIsExpanded(false);
                                            }}
                                            multiple={true}
                                            labelId="assigned_executive-label"
                                            label="assigned_executive"
                                        >
                                            {[...new Map(userList?.data?.map((r: any) => [r?._id, { label: r?.name, id: r?._id }])).values()]
                                                .map((stage: any) => (<MenuItem key={stage?.id} value={stage?.id} > {stage?.label}  </MenuItem>))}
                                        </Select>
                                    </FormControl>
                                )}
                            />
                            {/* <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <FormControl sx={{ width: 200 }} size="small">
                                        <InputLabel id="client-label">Status </InputLabel>
                                        <Select
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (isKanbanBoard) { setPages(1); }
                                                setIsExpanded(false);
                                            }}
                                            multiple={true}
                                            labelId="status-label"
                                            label="status"
                                        >
                                            {STATUS_LIST?.map((val: any) => (<MenuItem key={val?.value} value={val?.value}>{val?.label}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                )}
                            /> */}
                            <Controller
                                name="date"
                                control={control}
                                render={({ field }) => (
                                    <FormControl sx={{ width: 200 }} size="small">
                                        <InputLabel id="date-label"> Expire On</InputLabel>
                                        <Select
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (isKanbanBoard) { setPages(1); }
                                                setIsExpanded(false);
                                            }}
                                            labelId="date-label"
                                            label="Date"
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            <MenuItem value="expired"> Expired </MenuItem>
                                            <MenuItem value="today"> Today </MenuItem>
                                            <MenuItem value="week">This Week</MenuItem>
                                            <MenuItem value="month"> This Month</MenuItem>
                                            <MenuItem value="custom">Custom</MenuItem>
                                        </Select>
                                    </FormControl>
                                )}
                            />
                            {date === "custom" && (
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                label="Start Date"
                                                value={field.value}
                                                onChange={field.onChange}
                                                slotProps={{ textField: { size: "small" } }}
                                                format="DD/MM/YYYY"
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="endDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                label="End Date"
                                                value={field.value}
                                                onChange={field.onChange}
                                                minDate={startDate}
                                                slotProps={{ textField: { size: "small" } }}
                                                format="DD/MM/YYYY"
                                            />
                                        )}
                                    />

                                </LocalizationProvider>
                            )}
                            {(client?.length > 0 || (!isKanbanBoard && stage?.length > 0) || date !== '' || assigned_executive?.length > 0 || status?.length > 0) && <IconButton
                                sx={{ fontSize: "20px", width: 26, height: 26 }}
                                onClick={handleClose}
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </IconButton>}
                        </Box>}

                    {!OpenArchiveTable && (isKanbanBoard ?
                        <KanbanBoard boards={boardData} sx={{ mt: 6 }} onShowMore={handleSeeMore} onRefresh={handleRefresh} onDrop={handleDrop} />
                        : <AppDataTable
                            rows={clientSubsidy}
                            columns={columns}
                            loading={clientLoading}
                            getRowId={(row) => row._id}
                            sx={{
                                mt: date === "custom" ? 5 : 0,
                                "@media (max-width:1690px)": { mt: "40px", },
                                height: "500px"
                            }}
                            serverPagination
                            rowCount={clientSubsidyPagination?.totalRecords || 0}
                            paginationModel={paginationModel}
                            onPaginationModelChange={(newModel) => {
                                setPaginationModel(newModel);
                            }}
                        />)}

                    {OpenArchiveTable && <AppDataTable
                        rows={clientSubsidy}
                        columns={columns}
                        loading={clientLoading}
                        getRowId={(row) => row._id}
                        onRowClick={(row) => { navigate(`/client-case/${row.id}`) }}
                    />}
                </Box>
            </PageContent >

            <FormContainer
                variant="drawer"
                open={formDrawerOpen}
                onClose={() => {
                    if (!isLoading) {
                        handleActions(false, null, 'view');
                    }
                }}
                formSysName={SYSTEM_FORM_NAMES.CASE}
                onSubmit={handleFormSubmit}
                initialValues={(formMode === 'edit' || formMode === 'view') && selectedClientSubsidy ? (() => {
                    const { createdAt, updatedAt,
                        assigned_executive_ref: { name: executiveName } = {},
                        client: { _id: clientId } = {},
                        subsidy_ref: { subsidy_name: subsidyName } = {},
                        current_stage_ref: { label: currentStage } = {}, ...clientSubsidy } = selectedClientSubsidy;
                    return { ...clientSubsidy, assigned_executive_ref: executiveName, client: clientId, subsidy_ref: subsidyName, current_stage_ref: currentStage };
                })() : undefined}
                title={formMode === 'edit' ? "Edit Case" : formMode === 'view' ? "View Case" : 'Add Case'}
                mode={formMode}
                isLoading={createMutation.isPending || updateMutation.isPending}
                onSuccess={() => {
                    handleActions(false, null, 'view');
                }}
                anchor="right"
                drawerWidth={1000}
            />

            {/* Archive Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    if (!isLoading) {
                        setDeleteDialogOpen(false);
                        setSelectedClientSubsidy(null);
                    }
                }}
            >
                <DialogTitle>Archive Client Subsidy</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to archive this case ? This case will be moved to the archive.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        onClick={() => {
                            setDeleteDialogOpen(false);
                            setSelectedClientSubsidy(null);
                        }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="small"
                        onClick={confirmDelete}
                        color="error"
                        variant="contained"
                        disabled={isLoading}
                    >
                        {deleteMutation.isPending ? 'Loading...' : 'Archive'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    </>)
}