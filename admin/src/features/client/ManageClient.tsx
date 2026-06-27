import { PageHeader } from "@/components/common/PageHeader";
import { Alert, Box, Button, ButtonGroup, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip, Typography } from "@mui/material";
import { FormatListBulleted as FormatListBulletedIcon } from '@mui/icons-material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { PageContent } from "@/components/common/PageContent";
import { AppDataTable } from "@/components/common/AppDataTable";
import { useState } from "react";
import { FormContainer } from "@/components/form-builder/FormContainer";
import { SYSTEM_FORM_NAMES, transformFormSchema } from "@/utils/formUtils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formsAPI } from "@/api/forms";
import { Clients, clientsAPI, CreateClientsPayload } from "@/api/manageClient";
import { GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { FormField, FormSection } from "@aatulwork/customform-renderer";
import { useAppAlert } from "@/components/common/AppAlert";
import { UpdateRolePayload } from "@/api/roles";


export default function ManageClient() {
    const queryClient = useQueryClient();
    const { showAlert, AlertComponent } = useAppAlert();

    const [formDrawerOpen, setFormDrawerOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedClient, setSelectedClient] = useState<Clients | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // GET form defination
    const {
        data: formSchemaRaw,
        isLoading: formDefLoading,
        error: formDefError
    } = useQuery({
        queryKey: ['formDefinition', SYSTEM_FORM_NAMES.MANAGE_CLIENTS],
        queryFn: async () => {
            try {
                const form = await formsAPI.getByName(SYSTEM_FORM_NAMES.MANAGE_CLIENTS);
                return transformFormSchema(form);
            } catch (error: any) {
                console.error('Error fetching role form:', error);
                throw error;
            }
        },
        retry: 1,
    });

    const formSchema = formSchemaRaw;

    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10, });
    // GET clients list
    const {
        data: clientData,
        isLoading: clientLoading,
    } = useQuery({
        queryKey: ['manage-clients', paginationModel.page, paginationModel.pageSize],
        queryFn: async () => {
            // API uses 1-based page numbers
            const apiPage = paginationModel.page + 1;
            const apiLimit = paginationModel.pageSize;
            return await clientsAPI.getAll(apiPage, apiLimit);
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });
    const clients = clientData?.data || [];
    const pagination = clientData?.pagination as any

    // Create client mutation
    const createMutation = useMutation({
        mutationFn: (payload: CreateClientsPayload) => clientsAPI.create(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['manage-clients'] });
            showAlert('success', data?.message || 'Client created successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to create client');
        },
    });

    // Update client mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
            clientsAPI.update(id, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['manage-clients'] });
            showAlert('success', data?.message || 'Client updated successfully!');
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to update client');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (roleId: string) => clientsAPI.delete(roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manage-clients'] });
            showAlert('success', 'Client deleted successfully!');
            setDeleteDialogOpen(false);
            setSelectedClient(null)
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to delete client');
        },
    });

    const handleActions = (drawerOpen: boolean, client: any, type: typeof formMode) => {
        setFormDrawerOpen(drawerOpen);
        setFormMode(type);
        setSelectedClient(client)
    }

    // const handleDelete = async (client: Clients) => {
    //     setSelectedClient(client);
    //     setDeleteDialogOpen(true)
    // }

    const confirmDelete = () => {
        if (selectedClient?._id) {
            deleteMutation.mutate(selectedClient?._id);
        }
    }

    const handleFormSubmit = async (data: Record<string, any>) => {
        const payload = {
            ...data,
            contact_person: data?.contact_person?._id,
        }
        if (formMode === 'edit' && selectedClient?._id) {
            await updateMutation.mutateAsync({ id: selectedClient._id, payload: payload });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    // Build columns dynamically from form schema
    const buildColumns = (): GridColDef[] => {
        if (!formSchema) {
            // Fallback columns if form schema is not loaded
            return [
                { field: '_id', headerName: 'ID', width: 200 },
                { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
            ];
        }

        const columns: GridColDef[] = [];

        // Get all fields from sections
        const allFields = formSchema.sections
            ? formSchema.sections.flatMap((section: FormSection) => section.fields)
            : formSchema.fields || [];

        // Add columns for each field
        allFields.forEach((field: FormField) => {
            if (field.name.toLowerCase() === "client_name") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 150,
                    renderCell: (params: any) => {
                        const clientName = params?.row?.name;
                        return clientName;
                    },
                });
            } else if (field.name.toLowerCase() === "contact_person") {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    width: 150,
                    renderCell: (params: any) => {
                        const clientName = params?.row?.contact_person?.name;
                        return clientName;
                    },
                });
            } else {
                columns.push({
                    field: field.name,
                    headerName: field.label,
                    flex: 1,
                    minWidth: 150,
                    valueGetter: (_value, row: Clients) => {
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
                field: 'clientNo',
                headerName: 'Client Number.',
                width: 180,
                renderCell: (params: any) => {
                    return params?.row?.client_number;
                },
            },
            {
                field: 'actions',
                type: 'actions',
                headerName: 'Actions',
                width: 150,
                getActions: (params) => [
                    <GridActionsCellItem
                        key="view"
                        icon={<ViewIcon />}
                        label="View"
                        onClick={() => handleActions(true, params.row, 'view')}
                    />,
                    <GridActionsCellItem
                        key="edit"
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleActions(true, params.row, 'edit')}
                    />,
                    // <GridActionsCellItem
                    //     key="delete"
                    //     icon={<DeleteIcon color="error" />}
                    //     label="Delete"
                    //     onClick={() => handleDelete(params.row)}
                    // />,
                ],
            },
        );

        return columns;
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
            : (formDefError as any)?.response?.data?.message || 'Failed to load manage client form definition';

        return (
            <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        Manage Client Form Definition Not Found
                    </Typography>
                    <Typography variant="body2">
                        {errorMessage}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.MANAGE_CLIENTS}</strong>
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!formSchema) {
        return (
            <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Manage client form definition not found. Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.MANAGE_CLIENTS}</strong>
                </Alert>
            </Box>
        );
    }

    const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    const actionButtons = (
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
            <Tooltip title="Add Client" placement="bottom" arrow>
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
    );

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
            {AlertComponent}

            <PageHeader
                title="Manage Clients"
                icon="FormatListBulleted"
                fallbackIcon={FormatListBulletedIcon}
                sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
                actions={actionButtons}
            />

            <PageContent>
                <AppDataTable
                    rows={clients}
                    columns={columns}
                    loading={clientLoading}
                    getRowId={(row) => row._id}
                    serverPagination
                    rowCount={pagination?.totalRecords || 0}
                    paginationModel={paginationModel}
                    onPaginationModelChange={(newModel) => {
                        setPaginationModel(newModel);
                    }}

                />
            </PageContent>

            <FormContainer
                variant="drawer"
                open={formDrawerOpen}
                onClose={() => {
                    if (!isLoading) {
                        handleActions(false, null, 'view');
                    }
                }}
                formSysName={SYSTEM_FORM_NAMES.MANAGE_CLIENTS}
                onSubmit={handleFormSubmit}
                initialValues={(formMode === 'edit' || formMode === 'view') && selectedClient ? (() => {
                    const { createdAt, updatedAt, contact_person: { name } = {}, ...client } = selectedClient;
                    return { ...client, contact_person: name };
                })() : undefined}
                title={formMode === 'edit' ? "Edit Client" : formMode === 'view' ? "View Client" : 'Add Client'}
                mode={formMode}
                isLoading={createMutation.isPending || updateMutation.isPending}
                onSuccess={() => { handleActions(false, null, 'view'); }}
                anchor="right"
                drawerWidth={1000}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    if (!isLoading) {
                        setDeleteDialogOpen(false);
                        setSelectedClient(null);
                    }
                }}
            >
                <DialogTitle>Delete Client</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this client? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        onClick={() => {
                            setDeleteDialogOpen(false);
                            setSelectedClient(null);
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
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    </>)
}