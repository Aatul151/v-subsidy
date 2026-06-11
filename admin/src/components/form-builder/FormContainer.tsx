import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { formsAPI, FormSchema } from '@/api/forms';
import { transformFormSchema } from '@/utils/formUtils';
import { FormRenderer } from '@aatulwork/customform-renderer';
import { formRendererServices } from '@/utils/formRendererServices';
import { AppDrawer } from '@/components/common/AppDrawer';

interface FormContainerProps {
  // Form identification - use one of these
  formId?: string; // Form _id
  formSysName?: string; // Form system name (e.g., "user")
  formSchema?: FormSchema; // Pass formSchema directly (if already fetched)

  // Display mode
  variant: 'dialog' | 'drawer' | 'plain';
  open?: boolean; // Optional for plain variant
  onClose?: () => void; // Optional for plain variant

  // Form submission
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialValues?: Record<string, any>;

  // UI configuration
  title?: string;
  mode?: 'add' | 'edit' | 'view'; // For dynamic title generation and form rendering mode

  // Callbacks
  onSuccess?: () => void;
  onCancel?: () => void;
  onError?: (error: string) => void;

  // Loading state (for submit, formSchema loading is handled internally)
  isLoading?: boolean;

  // Dialog-specific props
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;

  // Drawer-specific props
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  drawerWidth?: number; // AppDrawer uses number for width

  // Common props
  disableEscapeKeyDown?: boolean;
}

export const FormContainer = ({
  formId,
  formSysName,
  formSchema: providedFormSchema,
  variant,
  open = true, // Default to true for plain variant
  onClose,
  onSubmit,
  initialValues,
  title,
  mode = 'add',
  onSuccess,
  onCancel,
  isLoading = false,
  maxWidth = 'md',
  fullWidth = true,
  anchor = 'right',
  drawerWidth = 600,
  disableEscapeKeyDown = false,
}: FormContainerProps) => {
  // Determine if we need to fetch formSchema
  const shouldFetch = !providedFormSchema && (!!formId || !!formSysName);
  const formIdentifier = formId || formSysName;
  const isPlainVariant = variant === 'plain';

  // Fetch formSchema if not provided - with caching to avoid unnecessary refetches
  const {
    data: fetchedFormSchema,
    isLoading: formLoading,
    error: formError,
  } = useQuery({
    queryKey: ['formDefinition', formIdentifier],
    queryFn: async () => {
      if (formId) {
        return await formsAPI.getById(formId);
      } else if (formSysName) {
        return await formsAPI.getByName(formSysName);
      }
      throw new Error('No form identifier provided');
    },
    enabled: shouldFetch && (isPlainVariant || open), // Always fetch for plain variant, or when open for dialog/drawer
    retry: 1,
    staleTime: 10 * 60 * 1000, // Cache form definition for 10 minutes - form definitions don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnMount: false, // Don't refetch if data exists in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Use provided formSchema or transform fetched one
  const formSchema = providedFormSchema || transformFormSchema(fetchedFormSchema || null);

  // Generate title if not provided
  const displayTitle = title || (mode === 'edit' ? 'Edit' : mode === 'view' ? 'View' : 'Add');

  // Handle success - close and call callback
  const handleSuccess = () => {
    onSuccess?.();
    onClose?.();
  };

  // Handle cancel - call callback and close
  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  // Loading state (formSchema loading or submit loading)
  const isFormLoading = shouldFetch ? formLoading : false;
  const overallLoading = isFormLoading || isLoading;

  // Handle close with loading check
  const handleClose = (_event?: {}, reason?: string) => {
    // No close handler for plain variant
    if (isPlainVariant || !onClose) {
      return;
    }
    // Prevent closing during loading
    if (overallLoading) {
      return;
    }
    // Prevent closing on backdrop click if loading
    if (reason === 'backdropClick' && overallLoading) {
      return;
    }
    onClose();
  };

  // Show loading state while fetching formSchema
  if (shouldFetch && isFormLoading) {
    if (isPlainVariant) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    } else if (variant === 'dialog') {
      return (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth={maxWidth}
          fullWidth={fullWidth}
          disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}
        >
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          </DialogContent>
        </Dialog>
      );
    } else {
      return (
        <AppDrawer
          open={open}
          onClose={handleClose}
          title="Loading..."
          anchor={anchor}
          width={typeof drawerWidth === 'number' ? drawerWidth : 600}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        </AppDrawer>
      );
    }
  }

  // Show error state if formSchema fetch failed
  if (shouldFetch && formError && !formSchema) {
    const errorMessage =
      formError instanceof Error
        ? formError.message
        : (formError as any)?.response?.data?.message || 'Failed to load form definition';

    if (isPlainVariant) {
      return (
        <Alert severity="error">{errorMessage}</Alert>
      );
    } else if (variant === 'dialog') {
      return (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth={maxWidth}
          fullWidth={fullWidth}
          disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mt: 1 }}>
              {errorMessage}
            </Alert>
          </DialogContent>
        </Dialog>
      );
    } else {
      return (
        <AppDrawer
          open={open}
          onClose={handleClose}
          title="Error"
          anchor={anchor}
          width={typeof drawerWidth === 'number' ? drawerWidth : 600}
        >
          <Alert severity="error">{errorMessage}</Alert>
        </AppDrawer>
      );
    }
  }

  // Don't render if no formSchema available
  if (!formSchema) {
    return null;
  }

  // Normalize formSchema for FormRenderer: package expects module as string | null and required title/name
  const normalizedFormSchema = {
    ...formSchema,
    title: formSchema.title ?? '',
    name: formSchema.name ?? '',
    module:
      formSchema.module == null
        ? undefined
        : typeof formSchema.module === 'string'
          ? formSchema.module
          : (formSchema.module as { _id?: string; name?: string })._id ??
            (formSchema.module as { _id?: string; name?: string }).name ??
            undefined,
  };

  const formRendererProps = {
    formSchema: normalizedFormSchema,
    onSubmit: mode === 'view' ? undefined : onSubmit,
    initialValues,
    isLoading: overallLoading,
    onSuccess: handleSuccess,
    onCancel: isPlainVariant ? undefined : handleCancel,
    hideTitle: true,
    allowResetOnValuesChange: isPlainVariant,
    mode: mode as 'view' | 'edit',
    services: formRendererServices,
  };

  // Render Plain variant - just the form, no wrapper
  if (isPlainVariant) {
    return <FormRenderer {...formRendererProps} />;
  }

  // Render Dialog variant
  if (variant === 'dialog') {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        disableEscapeKeyDown={disableEscapeKeyDown || overallLoading}
        PaperProps={{
          sx: { maxHeight: '90vh' },
        }}
      >
        <DialogTitle>{displayTitle}</DialogTitle>
        <DialogContent dividers>
          <FormRenderer {...formRendererProps} />
        </DialogContent>
      </Dialog>
    );
  }

  // Render Drawer variant
  return (
    <AppDrawer
      open={open}
      onClose={handleClose}
      title={displayTitle}
      anchor={anchor}
      width={typeof drawerWidth === 'number' ? drawerWidth : 600}
    >
      <FormRenderer {...formRendererProps} />
    </AppDrawer>
  );
};

