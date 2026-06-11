import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormGroup,
  FormControl,
  FormLabel,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessRulesAPI, FormAccessRule, Role, UpdateAccessRulePayload, CreateAccessRulePayload } from '@/api/accessRulesApi';
import { modulesAPI, Module } from '@/api/modulesApi';
import { rolesAPI, Role as RoleFromAPI } from '@/api/roles';
import { useAppAlert } from '@/components/common/AppAlert';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { OptionItem } from '@/api/forms';

interface AccessRuleEditorProps {
  open: boolean;
  onClose: () => void;
  module: string | null;
  isCreateMode?: boolean;
}

const ACTION_TYPES: Array<keyof FormAccessRule['actions']> = ['create', 'read', 'update', 'delete'];
const ADMIN_ROLES: Role[] = ['admin', 'superadmin'];

// Helper function to get default actions with admin roles
const getDefaultActions = (defaultAdminRoles: Role[] = []): FormAccessRule['actions'] => ({
  create: [...defaultAdminRoles],
  read: [...defaultAdminRoles],
  update: [...defaultAdminRoles],
  delete: [...defaultAdminRoles],
});

export const AccessRuleEditor = ({ open, onClose, module, isCreateMode = false }: AccessRuleEditorProps) => {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [rolesAllowed, setRolesAllowed] = useState<Role[]>([]);
  const [actions, setActions] = useState<FormAccessRule['actions']>({
    create: [],
    read: [],
    update: [],
    delete: [],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();

  // Fetch roles from API
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => {
      // Fetch all roles (using a large limit to get all roles)
      const response = await rolesAPI.getAll(1, 1000);
      return response.data;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Extract role names from API response - memoized to prevent unnecessary re-renders
  const ROLES: Role[] = useMemo(() => {
    return rolesData?.map((role: RoleFromAPI) => role.name as Role) || [];
  }, [rolesData]);

  // Get default admin roles (admin and superadmin if they exist in the fetched roles) - memoized
  const DEFAULT_ADMIN_ROLES: Role[] = useMemo(() => {
    return ROLES.filter((role) => ADMIN_ROLES.includes(role));
  }, [ROLES]);

  // Update actions when roles are loaded
  useEffect(() => {
    if (ROLES.length > 0 && DEFAULT_ADMIN_ROLES.length > 0) {
      const defaultActions = getDefaultActions(DEFAULT_ADMIN_ROLES);
      setActions(defaultActions);
      setRolesAllowed([...DEFAULT_ADMIN_ROLES]);
    }
  }, [ROLES, DEFAULT_ADMIN_ROLES]);

  // Fetch modules for create mode
  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: modulesAPI.getModules,
    enabled: isCreateMode && open,
  });

  // Convert modules to OptionItem format for search
  const moduleOptions: OptionItem[] = useMemo(() => {
    return modules.map((module: Module) => ({
      label: module.description ? `${module.name} - ${module.description}` : module.name,
      value: module._id,
    }));
  }, [modules]);

  // Fetch module access rule (only in edit mode)
  const { data: accessRule, isLoading } = useQuery({
    queryKey: ['accessRule', module],
    queryFn: () => accessRulesAPI.getModuleAccessRule(module!),
    enabled: !!module && !isCreateMode && open,
  });

  // Update state when data is fetched (edit mode)
  useEffect(() => {
    if (accessRule && !isCreateMode && ROLES.length > 0) {
      // Ensure admin is in all actions
      const ensureAdminInActions = (actionRoles: Role[]) => {
        const hasAdminRole = actionRoles.some((role) => ADMIN_ROLES.includes(role));
        if (!hasAdminRole) {
          return [...DEFAULT_ADMIN_ROLES, ...actionRoles];
        }
        return actionRoles;
      };

      const updatedActions = {
        create: ensureAdminInActions(accessRule.actions.create),
        read: ensureAdminInActions(accessRule.actions.read),
        update: ensureAdminInActions(accessRule.actions.update),
        delete: ensureAdminInActions(accessRule.actions.delete),
      };

      // Update rolesAllowed to include all roles from all actions
      const allRoles = new Set<Role>();
      Object.values(updatedActions).forEach((actionRoles: string[] | Role[]) => {
        (actionRoles as Role[]).forEach((role: Role) => allRoles.add(role));
      });

      setRolesAllowed(Array.from(allRoles));
      setActions(updatedActions as unknown as FormAccessRule['actions']);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessRule, isCreateMode, ROLES.length, DEFAULT_ADMIN_ROLES.length]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedModule('');
      if (DEFAULT_ADMIN_ROLES.length > 0) {
        setRolesAllowed([...DEFAULT_ADMIN_ROLES]);
        setActions(getDefaultActions(DEFAULT_ADMIN_ROLES));
      }
      setErrors({});
    }
  }, [open, DEFAULT_ADMIN_ROLES.length]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateAccessRulePayload) =>
      accessRulesAPI.createAccessRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRules'] });
      showAlert('success', 'Access rule created successfully');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create access rule';
      showAlert('error', errorMessage);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateAccessRulePayload) =>
      accessRulesAPI.updateModuleAccessRule(module!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRules'] });
      queryClient.invalidateQueries({ queryKey: ['accessRule', module] });
      showAlert('success', 'Access rules updated successfully');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update access rules';
      showAlert('error', errorMessage);
    },
  });

  const handleClose = () => {
    setSelectedModule('');
    if (DEFAULT_ADMIN_ROLES.length > 0) {
      setRolesAllowed([...DEFAULT_ADMIN_ROLES]);
      setActions(getDefaultActions(DEFAULT_ADMIN_ROLES));
    }
    setErrors({});
    onClose();
  };

  const handleRoleToggle = (role: Role) => {
    const newRoles = rolesAllowed.includes(role)
      ? rolesAllowed.filter((r) => r !== role)
      : [...rolesAllowed, role];
    setRolesAllowed(newRoles);
  };

  const handleActionToggle = (actionType: keyof FormAccessRule['actions'], role: Role) => {
    const currentRoles = actions[actionType];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    setActions({
      ...actions,
      [actionType]: newRoles,
    });
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // In create mode, check if module is selected
    if (isCreateMode && !selectedModule) {
      newErrors.module = 'Module is required';
    }

    // Check if read has at least 1 role
    if (actions.read.length === 0) {
      newErrors.read = 'Read action must contain at least 1 role';
    }

    // Check if admin is in all actions
    ACTION_TYPES.forEach((actionType) => {
      const hasAdminRole = actions[actionType].some((role) => ADMIN_ROLES.includes(role));
      if (!hasAdminRole) {
        newErrors[actionType] = 'Admin must be included in all actions';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    // Update rolesAllowed to be union of all action roles
    const allActionRoles = new Set<Role>();
    ACTION_TYPES.forEach((actionType) => {
      actions[actionType].forEach((role) => allActionRoles.add(role));
    });
    const updatedRolesAllowed = Array.from(allActionRoles);

    if (isCreateMode) {
      const payload: CreateAccessRulePayload = {
        module: selectedModule,
        rolesAllowed: updatedRolesAllowed,
        actions: {
          create: [...actions.create],
          read: [...actions.read],
          update: [...actions.update],
          delete: [...actions.delete],
        },
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateAccessRulePayload = {
        rolesAllowed: updatedRolesAllowed,
        actions: {
          create: [...actions.create],
          read: [...actions.read],
          update: [...actions.update],
          delete: [...actions.delete],
        },
      };
      updateMutation.mutate(payload);
    }
  };

  const isLoadingData = (!isCreateMode && isLoading) || rolesLoading;
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoadingData || ROLES.length === 0) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {AlertComponent}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isCreateMode ? 'Create Access Rule' : `Edit Access Rules - ${module}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Module Selection (Create Mode) */}
            {isCreateMode && (
              <Paper sx={{ p: 2, mb: 3 }}>
                {modules.length === 0 ? (
                  <Alert severity="warning">
                    No modules available. Please create a module first.
                  </Alert>
                ) : (
                  <FormControl fullWidth error={!!errors.module}>
                    <SearchableSelect
                      label="Module"
                      value={selectedModule}
                      onChange={(value) => {
                        setSelectedModule(value);
                        setErrors((prev) => ({ ...prev, module: '' }));
                      }}
                      options={moduleOptions}
                      disabled={isPending}
                      helperText={errors.module}
                      emptyText="No modules available"
                      placeholder="Search modules..."
                      margin="none"
                    />
                  </FormControl>
                )}
              </Paper>
            )}

            {/* Roles Allowed Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Roles Allowed
              </Typography>
              <FormControl component="fieldset" fullWidth>
                <FormGroup>
                  <Grid container spacing={2}>
                    {ROLES.map((role) => (
                      <Grid item xs={6} sm={4} md={3} key={role}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rolesAllowed.includes(role)}
                              onChange={() => handleRoleToggle(role)}
                              disabled={isPending || ADMIN_ROLES.includes(role)}
                            />
                          }
                          label={role.charAt(0).toUpperCase() + role.slice(1)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </FormGroup>
              </FormControl>
            </Paper>

            {/* Actions Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              {ACTION_TYPES.map((actionType) => (
                <Paper key={actionType} sx={{ p: 2, mb: 2 }}>
                  <FormControl component="fieldset" fullWidth error={!!errors[actionType]}>
                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                      {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                      {errors[actionType] && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {errors[actionType]}
                        </Alert>
                      )}
                    </FormLabel>
                    <FormGroup>
                      <Grid container spacing={2}>
                        {ROLES.map((role) => (
                          <Grid item xs={6} sm={4} md={3} key={role}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={actions[actionType].includes(role)}
                                  onChange={() => handleActionToggle(actionType, role)}
                                  disabled={isPending || ADMIN_ROLES.includes(role)}
                                  color={'primary'}
                                />
                              }
                              label={role.charAt(0).toUpperCase() + role.slice(1)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormGroup>
                  </FormControl>
                </Paper>
              ))}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Admin must be included in all actions. The "Roles Allowed" field will be automatically updated to include all roles from all actions.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="small"
            onClick={handleSave}
            variant="contained"
            disabled={isPending || (isCreateMode && modules.length === 0)}
          >
            {isPending ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create' : 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

