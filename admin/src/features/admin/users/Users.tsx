import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Stack,
  useTheme,
  useMediaQuery,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { AppDataTable } from '@/components/common/AppDataTable';
import { AppDrawer } from '@/components/common/AppDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Add as AddIcon, Edit as EditIcon, Refresh as RefreshIcon, Lock as LockIcon, People as PeopleIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsAPI, FormSection, FormField } from '@/api/forms';
import { usersAPI, User, CreateUserPayload, UpdateUserPayload } from '@/api/users';
import { FormContainer } from '@/components/form-builder/FormContainer';
import { useAppAlert } from '@/components/common/AppAlert';
import { transformFormSchema, SYSTEM_FORM_NAMES } from '@/utils/formUtils';
import { useForm, Controller } from 'react-hook-form';

export const Users = () => {
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch form schema only for building table columns
  // FormContainer will handle fetching for the form itself
  const {
    data: formSchemaRaw,
    isLoading: formDefLoading,
    error: formDefError
  } = useQuery({
    queryKey: ['formDefinition', SYSTEM_FORM_NAMES.USER],
    queryFn: async () => {
      try {
        const form = await formsAPI.getByName(SYSTEM_FORM_NAMES.USER);
        return transformFormSchema(form);
      } catch (error: any) {
        console.error('Error fetching user form:', error);
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

  // Fetch users with pagination
  const page = paginationModel.page;
  const pageSize = paginationModel.pageSize;

  const {
    data: usersData,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: async () => {
      // API uses 1-based page numbers
      const apiPage = page + 1;
      const apiLimit = pageSize;
      return await usersAPI.getAll(apiPage, apiLimit);
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  const users = usersData?.data || [];
  const pagination = usersData?.pagination;

  const handleRefresh = () => {
    // Reset pagination to first page
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize, // Keep current page size
    });
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({
      queryKey: ['users'],
      exact: false
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showAlert('success', 'User created successfully!');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to create user');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showAlert('success', 'User updated successfully!');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to update user');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersAPI.changePassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showAlert('success', 'Password changed successfully!');
      setPasswordDrawerOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to change password');
    },
  });

  // Change Password Form - Must be called before any conditional returns
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Common function to reset form state
  const resetFormState = () => {
    setFormDrawerOpen(false);
    setSelectedUser(null);
    setIsEditMode(false);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setIsEditMode(false);
    setFormDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setFormDrawerOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordDrawerOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (isEditMode && selectedUser?._id) {
      await updateMutation.mutateAsync({ id: selectedUser._id, payload: data });
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
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        { field: 'role', headerName: 'Role', width: 150 },
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
          valueGetter: (_value, row: User) => {
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
        width: 120,
        getActions: (params) => [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEdit(params.row)}
          />,
          <GridActionsCellItem
            key="changePassword"
            icon={<LockIcon />}
            label="Change Password"
            onClick={() => handleChangePassword(params.row)}
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
      : (formDefError as any)?.response?.data?.message || 'Failed to load user form definition';

    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            User Form Definition Not Found
          </Typography>
          <Typography variant="body2">
            {errorMessage}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.USER}</strong>
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!formSchema) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          User form definition not found. Please create a form definition with system name: <strong>{SYSTEM_FORM_NAMES.USER}</strong>
        </Alert>
      </Box>
    );
  }

  const columns = buildColumns();
  const isLoading = createMutation.isPending || updateMutation.isPending || changePasswordMutation.isPending;

  const handlePasswordSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      showAlert('error', 'Passwords do not match');
      return;
    }

    if (!data.password || data.password.trim() === '') {
      showAlert('error', 'Password cannot be empty');
      return;
    }

    if (selectedUser?._id) {
      await changePasswordMutation.mutateAsync({
        id: selectedUser._id,
        password: data.password,
      });
      reset();
    }
  };

  const handleClosePasswordDrawer = () => {
    if (!changePasswordMutation.isPending) {
      setPasswordDrawerOpen(false);
      setSelectedUser(null);
      reset();
    }
  };

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
          disabled={usersLoading || isLoading}
        >
          <RefreshIcon fontSize="small" />
        </Button>
      </Tooltip>
      <Tooltip title="Add User" placement="bottom" arrow>
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
        title="Users"
        icon={formSchema?.settings?.formIcon}
        fallbackIcon={PeopleIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <AppDataTable
          rows={users}
          columns={columns}
          loading={usersLoading}
          getRowId={(row: User) => row._id || ''}
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
        formSysName={SYSTEM_FORM_NAMES.USER}
        onSubmit={handleFormSubmit}
        initialValues={
          isEditMode && selectedUser
            ? (() => {
              // Extract all fields from user, excluding system fields
              const { _id, createdAt, updatedAt, ...userData } = selectedUser;
              return userData;
            })()
            : undefined
        }
        title={isEditMode ? 'Edit User' : 'Add New User'}
        mode={isEditMode ? 'edit' : 'add'}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSuccess={() => {
          resetFormState();
        }}
        anchor="right"
        drawerWidth={600}
      />

      {/* Change Password Drawer */}
      <AppDrawer
        open={passwordDrawerOpen}
        onClose={handleClosePasswordDrawer}
        title={`Change Password - ${selectedUser?.name || selectedUser?.email || 'User'}`}
        width={400}
        anchor="right"
      >
        <form onSubmit={handleSubmit(handlePasswordSubmit)}>
          <Stack spacing={3}>
            <Controller
              name="password"
              control={control}
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="New Password"
                  type="password"
                  fullWidth
                  size="small"
                  error={!!errors.password}
                  helperText={errors.password?.message as string}
                  autoComplete="new-password"
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: (value, formValues) =>
                  value === formValues.password || 'Passwords do not match',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  size="small"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message as string}
                  autoComplete="new-password"
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleClosePasswordDrawer}
                disabled={changePasswordMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={changePasswordMutation.isPending}
                startIcon={
                  changePasswordMutation.isPending ? (
                    <CircularProgress size={16} />
                  ) : null
                }
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </Box>
          </Stack>
        </form>
      </AppDrawer>
    </Box>
  );
};

