import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { AppDataTable } from '@/components/common/AppDataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Add as AddIcon, Edit as EditIcon, Refresh as RefreshIcon, Delete as DeleteIcon, Security as SecurityIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsAPI, FormSection, FormField } from '@/api/forms';
import { rolesAPI, Role, CreateRolePayload, UpdateRolePayload } from '@/api/roles';
import { FormContainer } from '@/components/form-builder/FormContainer';
import { useAppAlert } from '@/components/common/AppAlert';
import { transformFormSchema, SYSTEM_FORM_NAMES } from '@/utils/formUtils';

export const Roles = () => {
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch form schema only for building table columns
  // FormContainer will handle fetching for the form itself
  const {
    data: formSchemaRaw,
    isLoading: formDefLoading,
    error: formDefError
  } = useQuery({
    queryKey: ['formDefinition', SYSTEM_FORM_NAMES.ROLE],
    queryFn: async () => {
      try {
        const form = await formsAPI.getByName(SYSTEM_FORM_NAMES.ROLE);
        return transformFormSchema(form);
      } catch (error: any) {
        console.error('Error fetching role form:', error);
        throw error;
      }
    },
    retry: 1,
  });

  const formSchema = formSchemaRaw;

  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Fetch roles with pagination
  const page = paginationModel.page;
  const pageSize = paginationModel.pageSize;

  const {
    data: rolesData,
    isLoading: rolesLoading,
  } = useQuery({
    queryKey: ['roles', page, pageSize],
    queryFn: async () => {
      // API uses 1-based page numbers
      const apiPage = page + 1;
      const apiLimit = pageSize;
      return await rolesAPI.getAll(apiPage, apiLimit);
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  const roles = rolesData?.data || [];
  const pagination = rolesData?.pagination;

  const handleRefresh = () => {
    // Reset pagination to first page
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize, // Keep current page size
    });
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({
      queryKey: ['roles'],
      exact: false
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => rolesAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showAlert('success', 'Role created successfully!');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to create role');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      rolesAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showAlert('success', 'Role updated successfully!');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to update role');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => rolesAPI.delete(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showAlert('success', 'Role deleted successfully!');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to delete role');
    },
  });

  // Common function to reset form state
  const resetFormState = () => {
    setFormDrawerOpen(false);
    setSelectedRole(null);
    setIsEditMode(false);
  };

  const handleAdd = () => {
    setSelectedRole(null);
    setIsEditMode(false);
    setFormDrawerOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsEditMode(true);
    setFormDrawerOpen(true);
  };

  const handleDelete = async (role: Role) => {
    if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      if (role._id) {
        await deleteMutation.mutateAsync(role._id);
      }
    }
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (isEditMode && selectedRole?._id) {
      await updateMutation.mutateAsync({ id: selectedRole._id, payload: data });
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
      // Special handling for active field - show colored label
      if (field.name.toLowerCase() === 'isactive') {
        columns.push({
          field: field.name,
          headerName: field.label,
          width: 120,
          renderCell: (params: any) => {
            const isActive = params.value === true || params.value === 'true' || String(params.value).toLowerCase() === 'true';
            return (
              <Chip
                label={isActive ? 'Active' : 'Inactive'}
                color={isActive ? 'success' : 'error'}
                size="small"
                sx={{ fontWeight: 500 }}
              />
            );
          },
        });
      } else {
        columns.push({
          field: field.name,
          headerName: field.label,
          flex: 1,
          minWidth: 150,
          valueGetter: (_value, row: Role) => {
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
        field: 'createdAt',
        headerName: 'Created At',
        width: 180,
        valueGetter: (value: any) => {
          if (!value) return '';
          return new Date(value).toLocaleString();
        },
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        width: 180,
        valueGetter: (value: any) => {
          if (!value) return '';
          return new Date(value).toLocaleString();
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 150,
        getActions: (params) => [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEdit(params.row)}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDelete(params.row)}
            showInMenu
          />,
        ],
      }
    );

    return columns;
  };

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
            Role Form Definition Not Found
          </Typography>
          <Typography variant="body2">
            {errorMessage}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.ROLE}</strong>
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!formSchema) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Role form definition not found. Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.ROLE}</strong>
        </Alert>
      </Box>
    );
  }

  const columns = buildColumns();
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Build action buttons
  const actionButtons = (
    <ButtonGroup
      variant="outlined"
      size={isMobile ? 'small' : 'small'}
      sx={{
        '& .MuiButtonGroup-grouped': {
          minWidth: 'auto',
          padding: '5px 10px',
        },
      }}
    >
      <Tooltip title="Refresh" placement="bottom" arrow>
        <Button
          onClick={handleRefresh}
          disabled={rolesLoading || isLoading}
        >
          <RefreshIcon fontSize="small" />
        </Button>
      </Tooltip>
      <Tooltip title="Add Role" placement="bottom" arrow>
        <Button
          onClick={handleAdd}
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

  return (
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
        title="Roles"
        icon={formSchema?.settings?.formIcon}
        fallbackIcon={SecurityIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <AppDataTable
        rows={roles}
        columns={columns}
        loading={rolesLoading}
        getRowId={(row: Role) => row._id || ''}
        serverPagination
        rowCount={pagination?.total || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={(newModel) => {
          setPaginationModel(newModel);
        }}
      />
      </PageContent>

      {/* Add/Edit Form Drawer */}
      <FormContainer
        variant="drawer"
        open={formDrawerOpen}
        onClose={() => {
          if (!isLoading) {
            resetFormState();
          }
        }}
        formSysName={SYSTEM_FORM_NAMES.ROLE}
        onSubmit={handleFormSubmit}
        initialValues={
          isEditMode && selectedRole
            ? (() => {
                // Extract all fields from role, excluding system fields
                const { _id, createdAt, updatedAt, ...roleData } = selectedRole;
                return roleData;
              })()
            : undefined
        }
        title={isEditMode ? 'Edit Role' : 'Add New Role'}
        mode={isEditMode ? 'edit' : 'add'}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSuccess={() => {
          resetFormState();
        }}
        anchor="right"
        drawerWidth={600}
      />
    </Box>
  );
};

