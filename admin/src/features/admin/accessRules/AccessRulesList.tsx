import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  useMediaQuery,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { AppDataTable } from '@/components/common/AppDataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Lock as LockIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessRulesAPI, FormAccessRule } from '@/api/accessRulesApi';
import { AccessRuleEditor } from './AccessRuleEditor';
import { useAppAlert } from '@/components/common/AppAlert';

export const AccessRulesList = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch access rules
  const { data: accessRules = [], isLoading } = useQuery({
    queryKey: ['accessRules'],
    queryFn: accessRulesAPI.getAccessRules,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: accessRulesAPI.deleteAccessRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRules'] });
      showAlert('success', 'Access rule deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedModule(null);
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to delete access rule');
    },
  });

  const handleCreate = () => {
    setIsCreateMode(true);
    setSelectedModule(null);
    setEditorOpen(true);
  };

  const handleEdit = (module: string) => {
    setIsCreateMode(false);
    setSelectedModule(module);
    setEditorOpen(true);
  };

  const handleDelete = (module: string) => {
    setSelectedModule(module);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedModule) {
      deleteMutation.mutate(selectedModule);
    }
  };

  const getModuleName = (module: FormAccessRule['module']): string => {
    if (typeof module === 'string') return module;
    if (typeof module === 'object' && module !== null) {
      return module.name || module._id || '';
    }
    return '';
  };

  const columns: GridColDef[] = [
    {
      field: 'module',
      headerName: 'Module',
      flex: 1,
      minWidth: 200,
      valueGetter: (value: FormAccessRule['module']) => getModuleName(value),
    },
    {
      field: 'rolesAllowed',
      headerName: 'Roles Allowed',
      flex: 1,
      minWidth: 250,
      valueFormatter: (value: FormAccessRule['rolesAllowed']) => {
        if (!value || !Array.isArray(value)) return '';
        return value.join(', ');
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: { row: FormAccessRule }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(getModuleName(params.row.module))}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(getModuleName(params.row.module))}
          showInMenu
        />,
      ],
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
      <Tooltip title="Add Access Rule" placement="bottom" arrow>
        <Button
          onClick={handleCreate}
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
        title="Manage Role-Based Access Rules"
        icon="Security"
        fallbackIcon={LockIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <AppDataTable
        rows={accessRules}
        columns={columns}
        loading={isLoading}
        getRowId={(row: FormAccessRule) => {
          const moduleName = getModuleName(row.module);
          return moduleName || row._id || '';
        }}
      />
      </PageContent>

      <AccessRuleEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedModule(null);
          setIsCreateMode(false);
        }}
        module={selectedModule}
        isCreateMode={isCreateMode}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedModule(null);
        }}
      >
        <DialogTitle>Delete Access Rule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the access rule for module "{selectedModule}"? This action cannot be undone.
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
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

