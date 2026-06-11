import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesAPI, Module } from '@/api/modulesApi';
import { ModuleDialog } from './ModuleDialog';
import { useAppAlert } from '@/components/common/AppAlert';
import DescriptionIcon from '@mui/icons-material/Description';
import { AppDynamicIcon } from '@/components/common/AppDynamicIcon';

export const ModulesList = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch modules
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: modulesAPI.getModules,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: modulesAPI.deleteModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      showAlert('success', 'Module deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedModule(null);
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to delete module');
    },
  });

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedModule(null);
    setDialogOpen(true);
  };

  const handleDelete = (module: Module) => {
    if (module.isDefault) {
      showAlert('warning', 'Default modules cannot be deleted');
      return;
    }
    setSelectedModule(module);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedModule) {
      deleteMutation.mutate(selectedModule._id);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'icon',
      headerName: 'Icon',
      width: 80,
      renderCell: (params) => {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AppDynamicIcon
              iconName={params.value}
              fallbackIcon={DescriptionIcon}
              fontSize="small"
              color="action"
            />
          </Box>
        );
      },
    },
    {
      field: 'name',
      headerName: 'Module',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 200,
      valueFormatter: (value: string) => {
        if (!value) return '-';
        return value.length > 50 ? `${value.substring(0, 50)}...` : value;
      },
    },
    {
      field: 'isDefault',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => {
        if (params.row.isDefault) {
          return (
            <Chip
              label="Default"
              color="primary"
              size="small"
              variant="outlined"
            />
          );
        }
        return null;
      },
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        return (
          <Chip
            label={params.value ? 'Active' : 'Inactive'}
            color={params.value ? 'success' : 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value: string) => {
        if (!value) return '';
        return new Date(value).toLocaleString();
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: { row: Module }) => {
        const isDefault = params.row.isDefault;
        const actions = [];
        
        // Always show edit button - dialog will handle default module restrictions
        actions.push(
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label={isDefault ? 'Edit (Remove Default)' : 'Edit'}
            onClick={() => handleEdit(params.row)}
          />
        );
        
        // Only show delete for non-default modules
        if (!isDefault) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => handleDelete(params.row)}
              showInMenu
            />
          );
        }
        
        return actions;
      },
    },
  ];

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
      <Tooltip title="Add Module" placement="bottom" arrow>
        <Button
          onClick={handleAdd}
          color="primary"
          sx={{
            backgroundColor: (theme) => theme.palette.primary.main,
            color: (theme) => theme.palette.primary.contrastText,
            borderColor: (theme) => theme.palette.primary.main,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.dark,
              borderColor: (theme) => theme.palette.primary.dark,
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
        title="Manage Modules"
        icon="Build"
        fallbackIcon={DescriptionIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <AppDataTable
        rows={modules}
        columns={columns}
        loading={isLoading}
        getRowId={(row: Module) => row._id}
      />
      </PageContent>

      <ModuleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedModule(null);
        }}
        module={selectedModule}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedModule(null);
        }}
      >
        <DialogTitle>Delete Module</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedModule?.isDefault ? (
              <>
                <strong>Default modules cannot be deleted.</strong>
                <br />
                The module "{selectedModule?.name}" is marked as default and is protected from deletion.
              </>
            ) : (
              <>
                Are you sure you want to delete the module "{selectedModule?.name}"? This action cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedModule(null);
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending || selectedModule?.isDefault}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

