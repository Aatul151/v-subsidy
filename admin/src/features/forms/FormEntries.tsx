import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Alert,
  Badge,
  Link,
  useTheme,
  useMediaQuery,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { AppDataTable } from '@/components/common/AppDataTable';
import { AppPopover } from '@/components/common/AppPopover';
import { FileDisplay } from '@/components/common/FileDisplay';
import { CKEditorContentDisplay } from '@/components/common/CKEditorContentDisplay';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon, FilterList as FilterIcon, Visibility as ViewIcon, Settings as SettingsIcon, Download as DownloadIcon, Upload as UploadIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsAPI, formEntriesAPI, FormEntry, CreateFormEntryPayload, UpdateFormEntryPayload, FormSection, FormField } from '@/api/forms';
import { FormContainer } from '@/components/form-builder/FormContainer';
import { useAppAlert } from '@/components/common/AppAlert';
import { FilterDrawer } from '@/components/forms/FilterDrawer';
import { selectUserAndRoles, useAuthStore } from '@/store/authStore';
import { accessRulesAPI, FormAccessRule } from '@/api/accessRulesApi';
import { hasCreateAccess, hasUpdateAccess, hasDeleteAccess } from '@/utils/formAccess';
import { transformFormSchema } from '@/utils/formUtils';
import { useMemo } from 'react';
import { apiReferenceService } from '@/utils/apiReferenceService';
import { invalidateFormReferenceOptions } from '@/utils/formReferenceCache';
import { formatDateTime } from '@/utils/formUtils';

export const FormEntries = () => {
  const { formName } = useParams<{ formName: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuthStore(selectUserAndRoles);

  const userRole = user?.role;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
  const [accessRule, setAccessRule] = useState<FormAccessRule | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Decode form name from URL (in case it's encoded)
  const decodedFormName = formName ? decodeURIComponent(formName) : null;

  // Fetch form definition by name
  const {
    data: formSchemaRaw,
    isLoading: formDefLoading,
    error: formDefError
  } = useQuery({
    queryKey: ['formDefinition', decodedFormName],
    queryFn: async () => {
      if (!decodedFormName) throw new Error('Form name is required');
      try {
        const form = await formsAPI.getByName(decodedFormName);
        return transformFormSchema(form);
      } catch (error: any) {
        console.error('Error fetching form:', error);
        throw error;
      }
    },
    enabled: !!decodedFormName,
    retry: 1,
  });

  const formSchema = formSchemaRaw;

  // Fetch raw form data to check createdBy field
  const {
    data: rawFormData,
  } = useQuery({
    queryKey: ['formDefinitionRaw', decodedFormName],
    queryFn: async () => {
      if (!decodedFormName) return null;
      try {
        return await formsAPI.getByName(decodedFormName);
      } catch (error: any) {
        console.error('Error fetching raw form:', error);
        return null;
      }
    },
    enabled: !!decodedFormName,
    retry: 1,
  });

  // Check if current user is the form creator
  const isFormCreator = useMemo(() => {
    if (!user?._id || !rawFormData) return false;

    const formData = rawFormData as any; // Type assertion since createdBy might not be in FormSchema interface

    if (!isSuperAdmin && formData.createdBy) {
      const createdById = typeof formData.createdBy === 'string'
        ? formData.createdBy
        : formData.createdBy._id || formData.createdBy.id;
      return createdById === user._id;
    }

    return true;
  }, [user?._id, rawFormData]);

  // Fetch access rule when form schema is loaded
  useEffect(() => {
    const fetchAccessRule = async () => {
      if (formSchema?.module) {
        try {
          const moduleId = typeof formSchema.module === 'string'
            ? formSchema.module
            : formSchema.module._id || formSchema.module.name;
          const rule = await accessRulesAPI.getModuleAccessRule(moduleId);
          setAccessRule(rule);
        } catch (error) {
          // Access rule might not exist, that's okay
          console.log('No access rule found for module:', formSchema.module);
          setAccessRule(null);
        }
      } else {
        setAccessRule(null);
      }
    };

    if (formSchema) {
      fetchAccessRule();
    }
  }, [formSchema]);

  // Check if this is a single record form (need to check early for pagination)
  const isSingleRecordForm = formSchema?.settings?.isSingleRecordForm === true;


  // Pagination state - initialize with default, will be updated when formSchema loads
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10, // Default, will be updated when formSchema loads
  });

  // Update pageSize when formSchema loads and we know the form type (only for initialization)
  // For single record forms, always enforce pageSize = 1
  // For regular forms, allow any pageSize value (don't reset user's choice)
  useEffect(() => {
    if (!formSchema) return;

    setPaginationModel(prev => {
      // Single record form → force 1
      if (isSingleRecordForm && prev.pageSize !== 1) {
        return { ...prev, pageSize: 1, page: 0 };
      }

      // Back to normal form → restore default
      if (!isSingleRecordForm && prev.pageSize === 1) {
        return { ...prev, pageSize: 10, page: 0 };
      }

      return prev;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSingleRecordForm]);

  // Fetch form entries with pagination
  // Using paginationModel values directly in query key ensures React Query refetches when they change
  // For single record forms, pageSize is 1, for regular forms it can be any value (10, 25, 50, 100, etc.)
  const page = paginationModel.page;
  const pageSize = paginationModel.pageSize;

  const {
    data: entriesData,
    isLoading: entriesLoading,
  } = useQuery({
    queryKey: ['formEntries', decodedFormName, page, pageSize, filters],
    queryFn: async () => {
      // Use the page and pageSize from the query key context
      const apiPage = page + 1; // API uses 1-based page numbers
      const apiLimit = pageSize; // Use the current pageSize from paginationModel
      return await formEntriesAPI.getAll({
        formName: decodedFormName!,
        page: apiPage,
        limit: apiLimit,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });
    },
    // Only enable when formSchema is loaded
    // For single record forms, ensure pageSize is 1; for regular forms, allow any pageSize
    enabled: !!decodedFormName && !!formSchema && (
      (isSingleRecordForm && paginationModel.pageSize === 1) ||
      (!isSingleRecordForm && paginationModel.pageSize !== 1)
    ),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });

  const entries = entriesData?.data || [];
  const pagination = entriesData?.pagination;

  // For single record forms, use the first entry from the entries array
  const singleRecord = isSingleRecordForm ? (entries.length > 0 ? entries[0] : null) : null;

  // Get all formReference fields from the schema
  const formReferenceFields = useMemo(() => {
    if (!formSchema) return [];
    const allFields = formSchema.sections
      ? formSchema.sections.flatMap((section: FormSection) => section.fields)
      : formSchema.fields || [];
    return allFields.filter(
      (field: FormField) =>
        field.type === 'formReference' &&
        field.referenceFormName &&
        field.referenceFieldName
    );
  }, [formSchema]);

  // Get all apiReference fields from the schema
  const apiReferenceFields = useMemo(() => {
    if (!formSchema) return [];
    const allFields = formSchema.sections
      ? formSchema.sections.flatMap((section: FormSection) => section.fields)
      : formSchema.fields || [];
    return allFields.filter(
      (field: FormField) =>
        field.type === 'apiReference' &&
        field.apiEndpoint &&
        field.apiLabelField
    );
  }, [formSchema]);

  // Get all filterable fields from the schema
  const filterableFields = useMemo(() => {
    if (!formSchema) return [];
    const allFields = formSchema.sections
      ? formSchema.sections.flatMap((section: FormSection) => section.fields)
      : formSchema.fields || [];
    return allFields.filter((field: FormField) => field.allowFilter === true);
  }, [formSchema]);

  // Create a unique key for all form references (for caching)
  const formReferenceKey = useMemo(() => {
    return formReferenceFields
      .map((field: FormField) => `${field.referenceFormName}_${field.referenceFieldName}`)
      .sort()
      .join('|');
  }, [formReferenceFields]);

  // Fetch all form reference mappings in a single query
  const formReferenceMapsQuery = useQuery({
    queryKey: ['formReferenceMaps', formReferenceKey],
    queryFn: async () => {
      if (formReferenceFields.length === 0) return {};

      // Fetch all form references in parallel
      const fetchPromises = formReferenceFields.map(async (field: FormField) => {
        if (!field.referenceFormName || !field.referenceFieldName) return null;

        try {
          // Only fetch _id and the referenceFieldName to optimize payload
          // Format: ['_id', 'payload.fieldName'] - backend will return only these fields
          const fieldsToSelect = ['_id', `payload.${field.referenceFieldName}`];
          const response = await formEntriesAPI.getAll({
            formName: field.referenceFormName,
            page: 1,
            limit: 1000,
            fields: fieldsToSelect,
          });
          const entries = response.data || [];

          // Create a map of entry ID -> label value
          const idToLabelMap: Record<string, string> = {};
          entries.forEach((entry: FormEntry) => {
            if (entry._id) {
              const labelValue = entry.payload?.[field.referenceFieldName!] ||
                entry[field.referenceFieldName!] ||
                `Entry ${entry._id.substring(0, 8)}`;
              idToLabelMap[entry._id] = String(labelValue);
            }
          });

          return { fieldName: field.name, map: idToLabelMap };
        } catch (error) {
          console.error(`Failed to load form reference for ${field.referenceFormName}:`, error);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);

      // Convert array of results to object keyed by field name
      const maps: Record<string, Record<string, string>> = {};
      results.forEach((result) => {
        if (result && result.fieldName) {
          maps[result.fieldName] = result.map;
        }
      });

      return maps;
    },
    enabled: formReferenceFields.length > 0 && !!formSchema,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Get the form reference maps from query result
  const formReferenceMaps = formReferenceMapsQuery.data || {};

  // Create a unique key for all API references (for caching)
  const apiReferenceKey = useMemo(() => {
    return apiReferenceFields
      .map((field: FormField) => `${field.apiEndpoint}_${field.apiLabelField}_${field.apiValueField || '_id'}`)
      .sort()
      .join('|');
  }, [apiReferenceFields]);

  // Fetch all API reference mappings in a single query
  const apiReferenceMapsQuery = useQuery({
    queryKey: ['apiReferenceMaps', apiReferenceKey],
    queryFn: async () => {
      if (apiReferenceFields.length === 0) return {};

      // Fetch all API references in parallel
      const fetchPromises = apiReferenceFields.map(async (field: FormField) => {
        if (!field.apiEndpoint || !field.apiLabelField) return null;

        try {
          const options = await apiReferenceService.fetchOptions(
            field.apiEndpoint,
            field.apiLabelField,
            field.apiValueField || '_id'
          );

          // Create a map of value -> label
          const valueToLabelMap: Record<string, string> = {};
          options.forEach((option) => {
            valueToLabelMap[option.value] = option.label;
          });

          return { fieldName: field.name, map: valueToLabelMap };
        } catch (error) {
          console.error(`Failed to load API reference for ${field.apiEndpoint}:`, error);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);

      // Convert array of results to object keyed by field name
      const maps: Record<string, Record<string, string>> = {};
      results.forEach((result) => {
        if (result && result.fieldName) {
          maps[result.fieldName] = result.map;
        }
      });

      return maps;
    },
    enabled: apiReferenceFields.length > 0 && !!formSchema,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Get the API reference maps from query result
  const apiReferenceMaps = apiReferenceMapsQuery.data || {};

  const handleRefresh = () => {
    // Reset pagination to first page
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize, // Keep current page size
    });
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({
      queryKey: ['formEntries', decodedFormName],
      exact: false
    });
    // Also invalidate form reference maps to refresh labels
    queryClient.invalidateQueries({
      queryKey: ['formReferenceMaps'],
      exact: false
    });
  };

  const handleApplyFilters = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    // Reset to first page when filters change
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize,
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    // Reset to first page when filters are cleared
    setPaginationModel({
      page: 0,
      pageSize: paginationModel.pageSize,
    });
  };

  // Export entries handler
  const handleExport = async () => {
    if (!decodedFormName) return;

    try {
      // Call CSV export API
      const csvBlob = await formEntriesAPI.exportCSV(
        decodedFormName,
        100000, // limit
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Create download link for CSV file
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${decodedFormName}-entries-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('success', 'Entries exported to CSV successfully');
    } catch (error: any) {
      console.error('Error exporting entries:', error);
      showAlert('error', error.response?.data?.message || 'Failed to export entries');
    }
  };

  // Import entries handler - opens dialog
  const handleImport = () => {
    setImportDialogOpen(true);
  };

  // Download template CSV
  const handleDownloadTemplate = async () => {
    if (!decodedFormName) return;

    try {
      // Export empty CSV (limit 0 or 1 empty entry) to get headers
      // We'll use limit 1 to get the structure, but the API should handle empty export
      const csvBlob = await formEntriesAPI.exportCSV(decodedFormName, 1, {});

      // Create download link for template CSV file
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${decodedFormName}-template-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('success', 'Template file downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      showAlert('error', error.response?.data?.message || 'Failed to download template file');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!decodedFormName) {
      showAlert('error', 'Form name is required');
      event.target.value = '';
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showAlert('error', 'Please select a CSV file');
      event.target.value = '';
      return;
    }

    setImporting(true);

    try {
      // Call CSV import API
      const result = await formEntriesAPI.importCSV(decodedFormName, file, {
        skipErrors: false,
        updateExisting: false,
        dryRun: false,
      });

      // Refresh entries list
      queryClient.invalidateQueries({
        queryKey: ['formEntries', decodedFormName],
        exact: false
      });

      // Also invalidate form reference maps to refresh labels
      queryClient.invalidateQueries({
        queryKey: ['formReferenceMaps'],
        exact: false
      });

      // Show result
      if (result.failed === 0) {
        const message = result.imported > 0
          ? `Successfully imported ${result.imported} entry/entries`
          : result.updated > 0
            ? `Successfully updated ${result.updated} entry/entries`
            : 'Import completed';
        showAlert('success', message);
        // Close dialog and reset file input on success
        setImportDialogOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorDetails = result.errors?.slice(0, 3).map(e => `Row ${e.row}: ${e.error}`).join('; ') || '';
        showAlert(
          'warning',
          `Import completed: ${result.imported} imported, ${result.updated} updated, ${result.failed} failed. ${errorDetails}${result.errors && result.errors.length > 3 ? '...' : ''}`
        );
        // Reset file input but keep dialog open to show errors
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error('Error importing CSV file:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to import CSV file';
      showAlert('error', errorMessage);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setImporting(false);
    }
  };

  // Common form title for messages
  const formTitle = formSchema?.title || decodedFormName || 'Form';

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateFormEntryPayload) => formEntriesAPI.create(payload),
    onSuccess: () => {
      // For single record forms, skip invalidations here - let FormContainer's onSuccess handle it
      if (!isSingleRecordForm) {
        // Invalidate all form entries queries (with pagination and filters) to trigger refetch
        queryClient.invalidateQueries({
          queryKey: ['formEntries', decodedFormName],
          exact: false
        });
        // Only invalidate form reference maps if form has formReference fields
        if (formReferenceFields.length > 0) {
          queryClient.invalidateQueries({
            queryKey: ['formReferenceMaps'],
            exact: false
          });
        }
        // Invalidate form reference options cache for this form (so dropdowns refresh)
        if (decodedFormName) {
          invalidateFormReferenceOptions(decodedFormName, queryClient);
        }
      }
      showAlert('success', `${formTitle} entry created successfully!`);
      // Dialog will be closed by FormContainer's onSuccess callback
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || `Failed to create ${formTitle} entry`);
      // Dialog stays open on error - handled by FormContainer
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFormEntryPayload }) =>
      formEntriesAPI.update(id, payload),
    onSuccess: () => {
      // For single record forms, skip invalidations here - let FormContainer's onSuccess handle it
      if (!isSingleRecordForm) {
        // Invalidate all form entries queries (with pagination and filters) to trigger refetch
        queryClient.invalidateQueries({
          queryKey: ['formEntries', decodedFormName],
          exact: false
        });
        // Only invalidate form reference maps if form has formReference fields
        if (formReferenceFields.length > 0) {
          queryClient.invalidateQueries({
            queryKey: ['formReferenceMaps'],
            exact: false
          });
        }
        // Invalidate form reference options cache for this form (so dropdowns refresh)
        if (decodedFormName) {
          invalidateFormReferenceOptions(decodedFormName, queryClient);
        }
      }
      showAlert('success', `${formTitle} entry updated successfully!`);
      // Dialog will be closed by FormContainer's onSuccess callback
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || `Failed to update ${formTitle} entry`);
      // Dialog stays open on error - handled by FormContainer
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => formEntriesAPI.delete(entryId, decodedFormName!),
    onSuccess: () => {
      // Invalidate all form entries queries (with pagination and filters) to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['formEntries', decodedFormName],
        exact: false
      });
      // Also invalidate form reference maps to refresh labels
      queryClient.invalidateQueries({
        queryKey: ['formReferenceMaps'],
        exact: false
      });
      // Invalidate form reference options cache for this form (so dropdowns refresh)
      if (decodedFormName) {
        invalidateFormReferenceOptions(decodedFormName, queryClient);
      }
      showAlert('success', `${formTitle} entry deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      showAlert('error', error.response?.data?.message || `Failed to delete ${formTitle} entry`);
    },
  });

  // Check permissions
  const canCreate = hasCreateAccess(userRole, accessRule);
  const canUpdate = hasUpdateAccess(userRole, accessRule);
  const canDelete = hasDeleteAccess(userRole, accessRule);

  // Auto-set form mode and entry for single record forms (plain variant - always rendered)
  useEffect(() => {
    if (isSingleRecordForm && formSchema && !entriesLoading) {
      if (singleRecord) {
        // If record exists, set to edit mode
        setSelectedEntry(singleRecord);
        setFormMode('edit');
      } else {
        // If no record exists, set to add mode
        setSelectedEntry(null);
        setFormMode('add');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSingleRecordForm, formSchema, singleRecord, entriesLoading]);

  const handleAdd = () => {
    setSelectedEntry(null);
    setFormMode('add');
    setFormDialogOpen(true);
  };

  const handleEdit = (entry: FormEntry) => {
    setSelectedEntry(entry);
    setFormMode('edit');
    setFormDialogOpen(true);
  };

  const handleDelete = (entry: FormEntry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleView = (entry: FormEntry) => {
    setSelectedEntry(entry);
    setFormMode('view');
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (!decodedFormName) return;

    // Files are already uploaded and stored as metadata in form values
    // Just submit the form data as-is (file metadata is already included)
    const payload: CreateFormEntryPayload | UpdateFormEntryPayload = {
      formName: decodedFormName,
      payload: data, // All data including file metadata
    };

    if (formMode === 'edit' && selectedEntry?._id) {
      await updateMutation.mutateAsync({ id: selectedEntry._id, payload });
    } else {
      await createMutation.mutateAsync(payload as CreateFormEntryPayload);
    }
  };

  const confirmDelete = () => {
    if (selectedEntry?._id) {
      deleteMutation.mutate(selectedEntry._id);
    }
  };

  // Build columns dynamically from form schema
  const buildColumns = (): GridColDef[] => {
    if (!formSchema) return [];

    const columns: GridColDef[] = [];

    // Get all fields from sections
    const allFields = formSchema.sections
      ? formSchema.sections.flatMap((section: FormSection) => section.fields)
      : formSchema.fields || [];

    // Error handler for file downloads
    const handleFileDownloadError = (error: any) => {
      showAlert('error', `Failed to download file: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    };

    // File Cell Component - uses shared FileDisplay component
    const FileCell = ({ fieldValue }: { fieldValue: any }) => {
      return <FileDisplay fieldValue={fieldValue} onDownloadError={handleFileDownloadError} />;
    };

    // Comment Cell Component with Popover for long text
    const CommentCell = ({ fieldValue }: { fieldValue: any }) => {
      if (!fieldValue || fieldValue === '') {
        return (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            No content
          </Typography>
        );
      }

      const textValue = String(fieldValue);
      const maxLength = 50; // Truncate after 50 characters
      const isLongText = textValue.length > maxLength;
      const truncatedText = isLongText ? textValue.substring(0, maxLength) + '...' : textValue;

      // If text is short, display directly
      if (!isLongText) {
        return (
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {textValue}
          </Typography>
        );
      }

      // If text is long, show truncated version with "View more" link
      return (
        <Box sx={{ display: 'flex', height: '100%', alignItems: 'center' }}>
          <AppPopover
            trigger={
              <Link
                component="button"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.dark',
                  },
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {truncatedText}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                    ml: 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  View more
                </Typography>
              </Link>
            }
            title="Full Content"
            maxWidth={400}
            maxHeight={300}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Typography
              variant="body2"
              sx={{
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                maxHeight: 250,
                overflow: 'auto',
              }}
            >
              {textValue}
            </Typography>
          </AppPopover>
        </Box>
      );
    };

    // Add columns for each field
    allFields.forEach((field: FormField) => {
      // Special handling for file fields - render as clickable links
      if (field.type === 'file') {
        columns.push({
          field: field.name,
          headerName: field.label,
          flex: 1,
          minWidth: 250,
          valueGetter: (_value, row: FormEntry) => {
            // Get value from payload object if it exists, otherwise from root (for backward compatibility)
            const fieldValue = row.payload?.[field.name] ?? row[field.name];
            return fieldValue; // Return raw value for renderCell
          },
          renderCell: (params) => {
            return <FileCell fieldValue={params.value} />;
          },
        });
        return; // Skip default handling for file fields
      }

      // Special handling for CKEditor fields - render formatted HTML content
      if (field.type === 'ckeditor') {
        columns.push({
          field: field.name,
          headerName: field.label,
          flex: 1,
          minWidth: 200,
          valueGetter: (_value, row: FormEntry) => {
            // Get value from payload object if it exists, otherwise from root (for backward compatibility)
            const fieldValue = row.payload?.[field.name] ?? row[field.name];
            return fieldValue; // Return raw value for renderCell
          },
          renderCell: (params) => {
            return (
              <CKEditorContentDisplay
                content={params.value || ''}
                maxLength={100}
                showViewButton={true}
              />
            );
          },
        });
        return; // Skip default handling for ckeditor fields
      }

      // Special handling for text/textarea fields - render with truncation and popover
      if (field.type === 'text') {
        columns.push({
          field: field.name,
          headerName: field.label,
          flex: 1,
          minWidth: 150,
          valueGetter: (_value, row: FormEntry) => {
            // Get value from payload object if it exists, otherwise from root (for backward compatibility)
            const fieldValue = row.payload?.[field.name] ?? row[field.name];
            return fieldValue; // Return raw value for renderCell
          },
          renderCell: (params) => {
            return <CommentCell fieldValue={params.value} />;
          },
        });
        return; // Skip default handling for text fields
      }

      // Default handling for other field types
      columns.push({
        field: field.name,
        headerName: field.label,
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row: FormEntry) => {
          // Get value from payload object if it exists, otherwise from root (for backward compatibility)
          const fieldValue = row.payload?.[field.name] ?? row[field.name];

          // Handle different data types
          if (fieldValue === null || fieldValue === undefined) return '';

          if (field.type === 'datepicker') {
            const datePickerMode = field.datePickerMode || 'date';
            return formatDateTime(fieldValue, { datePickerMode });
          }

          // Handle arrays for multiple selection fields (backward compatible with single values)
          // Also handle arrays for single selection fields (from old multiple data)
          const isMultipleField = (field.type === 'select' || field.type === 'formReference' || field.type === 'apiReference') && field.allowMultiple;
          let values: any[];
          if (isMultipleField) {
            // Multiple selection: handle both array and single value
            values = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
          } else {
            // Single selection: if value is array (from old multiple data), take first element
            if (Array.isArray(fieldValue)) {
              values = fieldValue.length > 0 ? [fieldValue[0]] : [];
            } else {
              values = fieldValue ? [fieldValue] : [];
            }
          }

          // Helper function to get label for a single value
          const getLabelForValue = (val: any): string => {
            // Custom rendering for formReference fields - show label instead of ID
            if (field.type === 'formReference' && field.referenceFormName && field.referenceFieldName) {
              const valueStr = String(val);
              const referenceMap = formReferenceMaps[field.name];
              if (referenceMap && referenceMap[valueStr]) {
                return referenceMap[valueStr];
              }
              // If label not found in cache, return ID (will update when cache loads)
              return valueStr;
            }

            // Custom rendering for apiReference fields - show label instead of value
            if (field.type === 'apiReference' && field.apiEndpoint && field.apiLabelField) {
              const valueStr = String(val);
              const referenceMap = apiReferenceMaps[field.name];
              if (referenceMap && referenceMap[valueStr]) {
                return referenceMap[valueStr];
              }
              // If label not found in cache, return value (will update when cache loads)
              return valueStr;
            }

            // Custom rendering for select and radio fields - show label instead of value
            if ((field.type === 'select' || field.type === 'radio') && field.options && field.options.length > 0) {
              const valueStr = String(val);
              // Find matching option
              const matchingOption = field.options.find((option) => {
                if (typeof option === 'string') {
                  return option === valueStr;
                } else {
                  return option.value === valueStr;
                }
              });

              if (matchingOption) {
                // Return label if OptionItem format, otherwise return the string option itself
                return typeof matchingOption === 'string' ? matchingOption : matchingOption.label;
              }
              // If no match found, return the value as fallback
              return valueStr;
            }

            return String(val);
          };

          // If multiple values, join them with comma
          if (values.length > 1 || (isMultipleField && values.length > 0)) {
            const labels = values.map(val => getLabelForValue(val));
            return labels.join(', ');
          }

          // Single value (or empty array)
          if (values.length === 1) {
            return getLabelForValue(values[0]);
          }

          // Fallback for empty or null values
          if (field.type === 'formReference' || field.type === 'apiReference' || field.type === 'select') {
            return '';
          }

          if (typeof fieldValue === 'object') return JSON.stringify(fieldValue);
          return String(fieldValue);
        },
      });
    });

    // Add metadata columns
    columns.push(
      {
        field: 'submittedBy',
        headerName: 'Submitted By',
        width: 200,
        valueGetter: (_value, row: FormEntry) => {
          if (row.submittedBy?.name) {
            return row.submittedBy.name;
          }
          return '';
        },
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (_value, row: FormEntry) => {
          return formatDateTime(row.createdAt, { datePickerMode: 'datetime' });
        },
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (_value, row: FormEntry) => {
          return formatDateTime(row.updatedAt, { datePickerMode: 'datetime' });
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 150,
        getActions: (params) => {
          const actions = [];
          // View action - available to all users
          actions.push(
            <GridActionsCellItem
              key="view"
              icon={<ViewIcon />}
              label="View"
              onClick={() => handleView(params.row)}
            />
          );
          if (canUpdate) {
            actions.push(
              <GridActionsCellItem
                key="edit"
                icon={<EditIcon />}
                label="Edit"
                onClick={() => handleEdit(params.row)}
              />
            );
          }
          if (canDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete"
                icon={<DeleteIcon />}
                label="Delete"
                onClick={() => handleDelete(params.row)}
              />
            );
          }
          return actions;
        },
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
      : (formDefError as any)?.response?.data?.message || 'Failed to load form';

    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            Form Not Found
          </Typography>
          <Typography variant="body2">
            {errorMessage}
          </Typography>
          {decodedFormName && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Form name: <strong>{decodedFormName}</strong>
            </Typography>
          )}
        </Alert>
        <Button variant="outlined" size="small" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  if (!formSchema) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Form not found. Please check the form name in the URL.
        </Alert>
        <Button variant="outlined" size="small" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  const columns = buildColumns();
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // For single record forms, show loading while fetching the record
  if (isSingleRecordForm && entriesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

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
      {isFormCreator && formSchema?.settings?.allowManageFromEntryPage && (
        <Tooltip title="Edit Form Definition" placement="bottom" arrow>
          <Button
            onClick={() => {
              if (decodedFormName) {
                navigate(`/form-builder/${encodeURIComponent(decodedFormName)}`);
              }
            }}
          >
            <SettingsIcon fontSize="small" />
          </Button>
        </Tooltip>
      )}
      {!isSingleRecordForm && filterableFields.length > 0 && (
        <Tooltip title="Filter" placement="bottom" arrow>
          <Button
            onClick={() => setFilterDrawerOpen(true)}
            disabled={entriesLoading || isLoading}
          >
            <Badge
              variant="dot"
              color="primary"
              invisible={Object.keys(filters).length === 0}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiBadge-badge': {
                  right: 3,
                  top: 7,
                },
              }}
            >
              <FilterIcon fontSize="small" />
            </Badge>
          </Button>
        </Tooltip>
      )}
      {!isSingleRecordForm && (
        <Tooltip title="Refresh" placement="bottom" arrow>
          <Button
            onClick={handleRefresh}
            disabled={entriesLoading || isLoading}
          >
            <RefreshIcon fontSize="small" />
          </Button>
        </Tooltip>
      )}
      {!isSingleRecordForm && (entries.length > 0 || (pagination?.total && pagination.total > 0)) && (
        <Tooltip title="Export Entries" placement="bottom" arrow>
          <Button
            onClick={handleExport}
            disabled={entriesLoading || isLoading}
          >
            <DownloadIcon fontSize="small" />
          </Button>
        </Tooltip>
      )}
      {!isSingleRecordForm && canCreate && (
        <Tooltip title="Import Entries" placement="bottom" arrow>
          <Button
            onClick={handleImport}
            disabled={isLoading}
          >
            <UploadIcon fontSize="small" />
          </Button>
        </Tooltip>
      )}
      {!isSingleRecordForm && canCreate && (
        <Tooltip title={isMobile ? 'Add' : `Add ${formSchema?.title || 'Entry'}`} placement="bottom" arrow>
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
      )}
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
        title={formSchema.title}
        icon={formSchema.settings?.formIcon}
        actions={actionButtons}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        {/* Only show datatable if not a single record form */}
        {!isSingleRecordForm && (
          <AppDataTable
            rows={entries}
            columns={columns}
            loading={entriesLoading}
            getRowId={(row: FormEntry) => row._id || ''}
            serverPagination
            rowCount={pagination?.total || 0}
            paginationModel={paginationModel}
            onPaginationModelChange={(newModel) => {
              // Update pagination state immediately
              // React Query will automatically refetch when queryKey changes
              setPaginationModel(newModel);
            }}
          />
        )}

        {/* Add/Edit/View Form - Plain variant for single record forms, Drawer for regular forms */}
        <FormContainer
          variant={isSingleRecordForm ? 'plain' : 'drawer'}
          open={isSingleRecordForm ? true : formDialogOpen}
          formSysName={decodedFormName || undefined}
          onSubmit={handleFormSubmit}
          initialValues={
            (formMode === 'edit' || formMode === 'view') && selectedEntry
              ? (() => {
                // Extract payload fields, or fallback to root level fields for backward compatibility
                if (selectedEntry.payload) {
                  return { ...selectedEntry.payload };
                }
                return {};
              })()
              : undefined
          }
          title={
            formMode === 'edit'
              ? `Edit ${formSchema?.title || 'Entry'}`
              : formMode === 'view'
                ? `View ${formSchema?.title || 'Entry'}`
                : `Add New ${formSchema?.title || 'Entry'}`
          }
          mode={formMode}
          isLoading={createMutation.isPending || updateMutation.isPending}
          onClose={isSingleRecordForm ? undefined : () => {
            if (!isLoading) {
              setFormDialogOpen(false);
              setSelectedEntry(null);
              setFormMode('add');
            }
          }}
          onCancel={isSingleRecordForm ? undefined : () => {
            setFormDialogOpen(false);
            setSelectedEntry(null);
            setFormMode('add');
          }}
          onSuccess={() => {
            // For single record forms, invalidate the entries query (which uses limit 1)
            if (isSingleRecordForm) {
              // Invalidate the entries query - same query key, just with limit 1
              queryClient.invalidateQueries({
                queryKey: ['formEntries', decodedFormName],
                exact: false
              });
              // Only invalidate form reference maps if form has formReference fields
              if (formReferenceFields.length > 0) {
                queryClient.invalidateQueries({
                  queryKey: ['formReferenceMaps'],
                  exact: false
                });
              }
              // Only invalidate form reference options if other forms reference this form
              // (This is handled by invalidateFormReferenceOptions which checks if queries exist)
              if (decodedFormName) {
                invalidateFormReferenceOptions(decodedFormName, queryClient);
              }
              // The useEffect will handle updating with refreshed data
              return;
            }
            setFormDialogOpen(false);
            setSelectedEntry(null);
            setFormMode('add');
          }}
          anchor="right"
          drawerWidth={600}
        />
      </PageContent>

      {/* Filter Drawer */}
      {filterableFields.length > 0 && (
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          fields={filterableFields}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          formReferenceMaps={formReferenceMaps}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!isLoading) {
            setDeleteDialogOpen(false);
            setSelectedEntry(null);
          }
        }}
      >
        <DialogTitle>Delete {formSchema?.title || 'Entry'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {formSchema?.title || 'Entry'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedEntry(null);
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

      {/* Import Entries Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          if (!importing) {
            setImportDialogOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={importing}
      >
        <DialogTitle>Import {formSchema?.title || 'Entries'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Instructions */}
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Import Instructions:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Download the template file below to see the required format</li>
                  <li>Fill in the template with your data</li>
                  <li>Upload the completed CSV file</li>
                  <li>Simple arrays use comma-separated values</li>
                  <li>Data types are automatically converted based on form definition</li>
                </ul>
              </Typography>
            </Alert>

            {/* Template Download */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Download template file:
              </Typography>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                disabled={importing || !decodedFormName}
                fullWidth
              >
                Download Template CSV
              </Button>
            </Box>

            {/* File Upload */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Select CSV file to import:
              </Typography>
              <input
                ref={fileInputRef}
                id="import-csv-file"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={importing}
              />
              <label htmlFor="import-csv-file" style={{ width: '100%', cursor: importing ? 'not-allowed' : 'pointer' }}>
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                  disabled={importing}
                  sx={{
                    py: 1.5,
                    borderStyle: 'dashed',
                    width: '100%',
                    '&:hover': {
                      borderStyle: 'dashed',
                    },
                  }}
                >
                  {importing ? 'Importing...' : 'Choose CSV File'}
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary">
                Select a CSV file that matches the template format
              </Typography>
            </Box>

            {importing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Importing entries, please wait...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!importing) {
                setImportDialogOpen(false);
              }
            }}
            disabled={importing}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
