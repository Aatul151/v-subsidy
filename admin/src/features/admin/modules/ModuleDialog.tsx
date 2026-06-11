import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesAPI, Module, CreateModuleData, UpdateModuleData } from '@/api/modulesApi';
import { useAppAlert } from '@/components/common/AppAlert';
import { AppSearchableSelect } from '@/components/common/AppSearchableSelect';
import { getIconSelectOptions } from '@/utils/iconMap';

interface ModuleDialogProps {
  open: boolean;
  onClose: () => void;
  module?: Module | null; // If provided, it's edit mode; if null/undefined, it's create mode
}

interface ModuleFormState {
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  isDefault: boolean;
}

export const ModuleDialog = ({ open, onClose, module }: ModuleDialogProps) => {
  const isEditMode = !!module;
  const currentIsDefault = module?.isDefault || false;

  // Single state object for all form fields
  const [formState, setFormState] = useState<ModuleFormState>({
    name: '',
    description: '',
    icon: '',
    isActive: true,
    isDefault: false,
  });

  // Get icon options for dropdown
  const iconSelectOptions = useMemo(() => {
    return getIconSelectOptions();
  }, []);

  const [error, setError] = useState<string | null>(null);
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();

  // Initialize form state when module changes
  useEffect(() => {
    if (module) {
      setFormState({
        name: module.name,
        description: module.description || '',
        icon: module.icon || '',
        isActive: module.isActive !== undefined ? module.isActive : true,
        isDefault: module.isDefault || false,
      });
    } else {
      // Reset to default values for create mode
      setFormState({
        name: '',
        description: '',
        icon: '',
        isActive: true,
        isDefault: false,
      });
    }
    setError(null);
  }, [module, open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateModuleData) => modulesAPI.createModule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      showAlert('success', 'Module created successfully');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create module';
      setError(errorMessage);
      showAlert('error', errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: UpdateModuleData }) =>
      modulesAPI.updateModule(moduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      showAlert('success', 'Module updated successfully');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update module';
      setError(errorMessage);
      showAlert('error', errorMessage);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    setFormState({
      name: '',
      description: '',
      icon: '',
      isActive: true,
      isDefault: false,
    });
    setError(null);
    onClose();
  };

  const handleFieldChange = (field: keyof ModuleFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formState.name.trim()) {
      setError(isEditMode ? 'Module name cannot be empty' : 'Module name is required');
      return;
    }

    if (isEditMode && module) {
      // Edit mode
      const moduleData: UpdateModuleData = {
        name: formState.name.trim().toLowerCase(),
        description: formState.description.trim() || undefined,
        icon: formState.icon.trim() || undefined,
        isActive: formState.isActive,
        isDefault: formState.isDefault,
      };
      updateMutation.mutate({ moduleId: module._id, data: moduleData });
    } else {
      // Create mode
      const moduleData: CreateModuleData = {
        name: formState.name.trim().toLowerCase(),
        description: formState.description.trim() || undefined,
        icon: formState.icon.trim() || undefined,
        isActive: formState.isActive,
        isDefault: formState.isDefault,
      };
      createMutation.mutate(moduleData);
    }
  };

  return (
    <>
      {AlertComponent}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditMode ? 'Edit Module' : 'Add New Module'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isEditMode && currentIsDefault && (
                <Alert severity="info">
                  This is currently a default module. You can uncheck the "Set as Default Module" toggle to remove the default status.
                </Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                autoFocus
                label="Module Name"
                fullWidth
                value={formState.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder={
                  isEditMode
                    ? 'Enter module name'
                    : 'Enter module name (will be converted to lowercase)'
                }
                error={!!error}
                helperText={
                  error || (!isEditMode ? 'Module name will be converted to lowercase' : '')
                }
                disabled={isPending || (isEditMode && currentIsDefault)}
                required
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formState.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter module description (optional)"
                disabled={isPending}
              />

              <AppSearchableSelect
                label=""
                value={formState.icon || ''}
                onChange={(value) => handleFieldChange('icon', value as string)}
                options={iconSelectOptions}
                placeholder="Select an icon for the module"
                helperText="Search and select an icon for the module (optional)"
                fullWidth
                size="small"
                disabled={isPending}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formState.isActive}
                    onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                    disabled={isPending || (isEditMode && currentIsDefault)}
                  />
                }
                label="Active"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formState.isDefault}
                    onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
                    disabled={isPending}
                  />
                }
                label="Set as Default Module"
              />

              {formState.isDefault && (
                <Alert severity="info">
                  Default modules are protected from deletion and editing.
                  {!isEditMode && ' Only one module should be set as default.'}
                </Alert>
              )}

              {isEditMode && currentIsDefault && !formState.isDefault && (
                <Alert severity="success">
                  Removing default status will allow editing and deletion of this module.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="small"
              type="submit"
              variant="contained"
              disabled={
                isPending ||
                !formState.name.trim() 
                
              }
            >
              {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

