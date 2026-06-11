import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tabs,
  Tab,
  Paper,
  TextField,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { AppDataTable } from '@/components/common/AppDataTable';
import { AppDrawer } from '@/components/common/AppDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Update as UpdateIcon, Download as DownloadIcon, Upload as UploadIcon, DynamicForm as DynamicFormIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formsAPI, FormSchema } from '@/api/forms';
import { modulesAPI, Module } from '@/api/modulesApi';
import { useAppAlert } from '@/components/common/AppAlert';
import { useAuthStore, selectUserAndRoles } from '@/store/authStore';

export const ManageForms = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormSchema | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [updateModuleDrawerOpen, setUpdateModuleDrawerOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    results: Array<{
      formName: string;
      formTitle: string;
      status: 'success' | 'error';
      message?: string;
    }>;
  } | null>(null);
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Use selectUserAndRoles to get isSuperAdmin
  const { user, isSuperAdmin } = useAuthStore(selectUserAndRoles);

  // Reset to tab 0 if user is not superadmin and somehow on system forms tab
  const effectiveActiveTab = isSuperAdmin ? activeTab : 0;

  // Fetch all forms
  const { data: allForms = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsAPI.getAll(),
  });

  // Fetch all modules for dropdown
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['modules'],
    queryFn: () => modulesAPI.getModules(),
  });

  // Filter forms created by current user
  // Superadmin can see all forms (custom and system), others see only their own forms
  const myForms = useMemo(() => {
    if (!user?._id) return [];

    // Superadmin can see all forms
    if (isSuperAdmin) {
      return allForms;
    }

    // For non-superadmin users, filter by createdBy
    return allForms.filter((form: any) => {
      // Check if form has createdBy field and it matches current user
      if (form.createdBy) {
        const createdById = typeof form.createdBy === 'string'
          ? form.createdBy
          : form.createdBy._id || form.createdBy.id;
        return createdById === user._id;
      }
      // If no createdBy field, show all forms (backend should handle filtering)
      // For now, return all forms - backend should filter by user
      return true;
    });
  }, [allForms, user?._id, isSuperAdmin]);

  // Filter forms by type (custom or system)
  const customForms = useMemo(() => {
    return myForms.filter((form: FormSchema) => form.formType !== 'system');
  }, [myForms]);

  const systemForms = useMemo(() => {
    return myForms.filter((form: FormSchema) => form.formType === 'system');
  }, [myForms]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      showAlert('success', 'Form deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedForm(null);
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to delete form');
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: ({ formId, formData }: { formId: string; formData: Partial<FormSchema> }) =>
      formsAPI.update(formId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      showAlert('success', 'Module updated successfully');
      setUpdateModuleDrawerOpen(false);
      setSelectedForm(null);
      setSelectedModuleId('');
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || 'Failed to update module');
    },
  });

  const handleEdit = (form: FormSchema) => {
    const formName = form.name;
    if (!formName) {
      showAlert('error', 'Form name not found');
      return;
    }

    // Navigate to form builder with form system name
    navigate(`/form-builder/${encodeURIComponent(formName)}`);
  };

  const handleDelete = (form: FormSchema) => {
    setSelectedForm(form);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedForm) {
      const formId = selectedForm._id || selectedForm.id;
      if (formId) {
        deleteMutation.mutate(formId);
      }
    }
  };

  const handleAddForm = () => {
    navigate('/form-builder');
  };

  // Export functions
  const handleExportAll = () => {
    const formsToExport = effectiveActiveTab === 0 ? customForms : systemForms;
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: formsToExport.length,
      forms: formsToExport.map((form) => {
        // Remove id, createdAt, updatedAt but keep _id for export
        const { id, createdAt, updatedAt, ...formData } = form;
        // Remove createdBy, updatedBy, __v if they exist (they might not be in FormSchema type)
        const cleanFormData: any = { ...formData };
        delete cleanFormData.createdBy;
        delete cleanFormData.updatedBy;
        delete cleanFormData.__v;
        return cleanFormData;
      }),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forms-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert('success', `Exported ${formsToExport.length} form(s) successfully`);
  };

  const handleExportForm = (form: FormSchema) => {
    // Remove id, createdAt, updatedAt but keep _id for export
    const { id, createdAt, updatedAt, ...formData } = form;
    // Remove createdBy, updatedBy, __v if they exist (they might not be in FormSchema type)
    const cleanFormData: any = { ...formData };
    delete cleanFormData.createdBy;
    delete cleanFormData.updatedBy;
    delete cleanFormData.__v;
    const exportData = {
      exportedAt: new Date().toISOString(),
      form: cleanFormData,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.name || 'form'}-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert('success', `Exported form "${form.title}" successfully`);
  };

  // Import functions
  const handleImportClick = () => {
    setImportDialogOpen(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Handle both single form and multiple forms format
      let formsToImport: FormSchema[] = [];

      if (jsonData.form) {
        // Single form format: { exportedAt, form: {...} }
        formsToImport = [jsonData.form];
      } else if (jsonData.forms && Array.isArray(jsonData.forms)) {
        // Multiple forms format: { exportedAt, count, forms: [...] }
        formsToImport = jsonData.forms;
      } else if (Array.isArray(jsonData)) {
        // Array of forms
        formsToImport = jsonData;
      } else {
        // Try as single form object
        formsToImport = [jsonData];
      }

      if (formsToImport.length === 0) {
        showAlert('error', 'No valid forms found in the JSON file');
        return;
      }

      // Import each form and track detailed results
      const importResults: Array<{
        formName: string;
        formTitle: string;
        status: 'success' | 'error';
        message?: string;
      }> = [];

      for (const formData of formsToImport) {
        const formName = formData.name || 'Unknown';
        const formTitle = formData.title || 'Unknown';

        try {
          // Remove fields that shouldn't be imported
          const { id, createdAt, updatedAt, ...restData } = formData;

          // Remove createdBy and updatedBy if they exist (they might not be in FormSchema type)
          const cleanFormData: any = { ...restData };
          delete cleanFormData.createdBy;
          delete cleanFormData.updatedBy;

          // Keep _id if provided in JSON (for preserving form ID during import)
          const formId = formData._id;

          // Convert module object to module ID if it's an object
          if (cleanFormData.module && typeof cleanFormData.module === 'object' && cleanFormData.module !== null) {
            cleanFormData.module = cleanFormData.module._id || (cleanFormData.module as any).id || cleanFormData.module.name || null;
          }

          // Validate required fields
          if (!cleanFormData.name || !cleanFormData.title) {
            importResults.push({
              formName,
              formTitle,
              status: 'error',
              message: 'Missing required fields: name or title',
            });
            continue;
          }

          // Only include _id if it was provided in the JSON (during import)
          // If _id is not in JSON, don't pass it to API (let API generate new ID)
          const formToCreate = formId !== undefined && formId !== null && formId !== ''
            ? { ...cleanFormData, _id: formId }
            : cleanFormData;

          const response = await formsAPI.create(formToCreate as any);

          // Check if API returned a summary or message
          const apiMessage = (response as any).message || 'Form imported successfully';

          importResults.push({
            formName,
            formTitle,
            status: 'success',
            message: apiMessage,
          });
        } catch (error: any) {
          console.error('Error importing form:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
          importResults.push({
            formName,
            formTitle,
            status: 'error',
            message: errorMessage,
          });
        }
      }

      // Calculate summary
      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;

      const summary = {
        total: formsToImport.length,
        success: successCount,
        failed: errorCount,
        results: importResults,
      };

      // Refresh forms list
      queryClient.invalidateQueries({ queryKey: ['forms'] });

      // Show summary dialog
      setImportSummary(summary);
      setImportSummaryOpen(true);
      setImportDialogOpen(false);

      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Error parsing JSON file:', error);
      showAlert('error', 'Invalid JSON file. Please check the file format.');
      event.target.value = '';
    }
  };

  const handleUpdateModule = (form: FormSchema) => {
    setSelectedForm(form);
    const currentModuleId = getModuleId(form.module);
    setSelectedModuleId(currentModuleId || '');
    setUpdateModuleDrawerOpen(true);
  };

  const handleSaveModuleUpdate = () => {
    if (!selectedForm) return;

    const formId = selectedForm._id || selectedForm.id;
    if (!formId) {
      showAlert('error', 'Form ID not found');
      return;
    }

    if (!selectedModuleId) {
      showAlert('error', 'Please select a module');
      return;
    }

    // Create updated form definition with new module (exclude _id and id)
    const { _id, id, ...formWithoutId } = selectedForm;
    const updatedForm: Partial<FormSchema> = {
      ...formWithoutId,
      module: selectedModuleId,
    };

    updateModuleMutation.mutate({ formId, formData: updatedForm });
  };

  const getModuleName = (module: string | any): string => {
    if (!module) return '-';
    if (typeof module === 'string') return module;
    return module.name || module._id || '-';
  };

  // Check if module is valid (not missing)
  const isModuleValid = (module: string | any): boolean => {
    if (!module) return false;
    const moduleName = getModuleName(module);
    return moduleName !== '-';
  };

  // Get module ID from form
  const getModuleId = (module: string | any): string | null => {
    if (!module) return null;
    if (typeof module === 'string') return module;
    return module._id || module.id || null;
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Form Title',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'name',
      headerName: 'Form Name',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'module',
      headerName: 'Module',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value, row: FormSchema) => getModuleName(row.module),
    },
    {
      field: 'sections',
      headerName: 'Sections',
      width: 100,
      valueGetter: (_value, row: FormSchema) => {
        return row.sections?.length || 0;
      },
    },
    {
      field: 'fields',
      headerName: 'Fields',
      width: 100,
      valueGetter: (_value, row: FormSchema) => {
        if (row.sections) {
          return row.sections.reduce((total, section) => total + (section.fields?.length || 0), 0);
        }
        return row.fields?.length || 0;
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value: string) => {
        if (!value) return '-';
        return new Date(value).toLocaleString();
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 180,
      getActions: (params: { row: FormSchema }) => {
        const hasValidModule = isModuleValid(params.row.module);
        const actions = [];

        // Edit action - disabled if module not found
        actions.push(
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label={!hasValidModule ? 'Edit (Module required)' : 'Edit'}
            onClick={() => handleEdit(params.row)}
            disabled={!hasValidModule}
          />
        );

        // Update Module action - only show if module not found
        if (!hasValidModule) {
          actions.push(
            <GridActionsCellItem
              key="update-module"
              icon={<UpdateIcon />}
              label="Update Module"
              onClick={() => handleUpdateModule(params.row)}
              showInMenu
            />
          );
        }

        // Export action
        actions.push(
          <GridActionsCellItem
            key="export"
            icon={<DownloadIcon />}
            label="Export Form"
            onClick={() => handleExportForm(params.row)}
            showInMenu
          />
        );

        // Delete action - disabled if module not found
        actions.push(
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label={!hasValidModule ? 'Delete (Module required)' : 'Delete'}
            onClick={() => handleDelete(params.row)}
            disabled={!hasValidModule}
            showInMenu
          />
        );

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
      <Tooltip title="Import Forms" placement="bottom" arrow>
        <Button onClick={handleImportClick}>
          <UploadIcon fontSize="small" />
        </Button>
      </Tooltip>
      <Tooltip title="Export All Forms" placement="bottom" arrow>
        <Button onClick={handleExportAll}>
          <DownloadIcon fontSize="small" />
        </Button>
      </Tooltip>
      <Tooltip title="Add Form" placement="bottom" arrow>
        <Button
          onClick={handleAddForm}
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
        title="Manage Forms"
        icon="DynamicForm"
        fallbackIcon={DynamicFormIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Forms from JSON</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Select a JSON file to import forms. The file can contain a single form or multiple forms.
            <br />
            <Typography component="span" variant="caption" color="text.secondary">
              Supported formats:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Single form: <code>{`{ "form": {...} }`}</code></li>
              <li>Multiple forms: <code>{`{ "forms": [...] }`}</code></li>
              <li>Array of forms: <code>{`[{...}, {...}]`}</code></li>
            </ul>
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              id="import-json-file"
              style={{ display: 'none' }}
            />
            <label htmlFor="import-json-file">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<UploadIcon />}
              >
                Choose JSON File
              </Button>
            </label>
            <Typography variant="caption" color="text.secondary">
              Select a JSON file exported from this system
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportDialogOpen(false);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Summary Dialog */}
      <Dialog
        open={importSummaryOpen}
        onClose={() => {
          setImportSummaryOpen(false);
          setImportSummary(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Summary</DialogTitle>
        <DialogContent>
          {importSummary && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Import Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    label={`Total: ${importSummary.total}`}
                    color="default"
                    variant="outlined"
                  />
                  <Chip
                    label={`Success: ${importSummary.success}`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`Failed: ${importSummary.failed}`}
                    color="error"
                    variant="outlined"
                  />
                </Box>

                {importSummary.success === importSummary.total && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    All forms imported successfully!
                  </Alert>
                )}

                {importSummary.failed > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Some forms failed to import. Check the details below.
                  </Alert>
                )}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Detailed Results:
              </Typography>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {importSummary.results.map((result, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: 1,
                      borderColor: result.status === 'success' ? 'success.main' : 'error.main',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: result.status === 'success'
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(244, 67, 54, 0.1)',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {result.formTitle}
                          </Typography>
                          <Chip
                            label={result.status === 'success' ? 'Success' : 'Failed'}
                            color={result.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Form Name: {result.formName}
                          </Typography>
                          {result.message && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                              {result.message}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportSummaryOpen(false);
              setImportSummary(null);
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <PageContent>
        <Paper>
          <Tabs
            value={effectiveActiveTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label={`Custom Forms (${customForms.length})`}
              value={0}
            />
            {isSuperAdmin && (
              <Tab
                label={`System Forms (${systemForms.length})`}
                value={1}
              />
            )}
          </Tabs>

          {/* Tab Panel Content */}
          <Box role="tabpanel" sx={{ p: 1.5 }}>
            <AppDataTable
              rows={effectiveActiveTab === 0 ? customForms : systemForms}
              columns={columns}
              loading={isLoading}
              getRowId={(row: FormSchema) => row._id || row.id || ''}
            />
          </Box>
        </Paper>
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedForm(null);
        }}
      >
        <DialogTitle>Delete Form</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the form "{selectedForm?.title}"? This action cannot be undone and will also delete all form entries associated with this form.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedForm(null);
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

      {/* Update Module Drawer */}
      <AppDrawer
        open={updateModuleDrawerOpen}
        onClose={() => {
          setUpdateModuleDrawerOpen(false);
          setSelectedForm(null);
          setSelectedModuleId('');
        }}
        title="Update Module"
        width={500}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Form: <strong>{selectedForm?.title}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Current Module: <strong>{getModuleName(selectedForm?.module) || 'Not assigned'}</strong>
            </Typography>
          </Box>

          <TextField
            select
            label="Select Module"
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            fullWidth
            required
            disabled={isLoadingModules || updateModuleMutation.isPending}
            helperText="Select a module to assign to this form"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {modules.map((module: Module) => (
              <MenuItem key={module._id} value={module._id}>
                {module.name}
                {module.description && ` - ${module.description}`}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setUpdateModuleDrawerOpen(false);
                setSelectedForm(null);
                setSelectedModuleId('');
              }}
              disabled={updateModuleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveModuleUpdate}
              disabled={updateModuleMutation.isPending || !selectedModuleId}
              startIcon={updateModuleMutation.isPending ? <CircularProgress size={16} /> : null}
            >
              {updateModuleMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </AppDrawer>
    </Box>
  );
};
