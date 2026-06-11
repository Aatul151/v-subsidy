import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Chip,
  Stack,
  Radio,
  RadioGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FormField, OptionItem, FormSchema, formsAPI } from '@/api/forms';
import { useState, useEffect } from 'react';
import { AppDrawer } from '@/components/common/AppDrawer';
import { apiReferenceService } from '@/utils/apiReferenceService';
import { SearchableSelect } from '@/components/common/SearchableSelect';

interface FieldConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  field: FormField | null;
  fieldIndex: number | null;
  onSave: (field: FormField) => void;
  onDelete: () => void;
  onValidateName?: (name: string) => boolean;
}

export const FieldConfigDrawer = ({
  open,
  onClose,
  field,
  fieldIndex: _fieldIndex,
  onSave,
  onDelete: _onDelete,
  onValidateName,
}: FieldConfigDrawerProps) => {
  const [formData, setFormData] = useState<Partial<FormField>>({});
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [nameError, setNameError] = useState<string>('');
  const [availableForms, setAvailableForms] = useState<FormSchema[]>([]);
  const [selectedFormSchema, setSelectedFormSchema] = useState<FormSchema | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingFormSchema, setLoadingFormSchema] = useState(false);
  const [availableEndpoints] = useState(apiReferenceService.getAvailableEndpoints());

  useEffect(() => {
    if (field) {
      setFormData({ ...field });
      // Load available forms when field config opens
      if (field.type === 'formReference') {
        loadAvailableForms();
        // If referenceFormName is set, load that form's schema
        if (field.referenceFormName) {
          loadFormSchema(field.referenceFormName);
        }
      }
    } else {
      // Reset when drawer closes
      setAvailableForms([]);
      setSelectedFormSchema(null);
    }
  }, [field]);

  const loadAvailableForms = async () => {
    setLoadingForms(true);
    try {
      const forms = await formsAPI.getAll();
      // Filter out system forms - only show custom forms for formReference
      const customForms = forms.filter(form => form.formType !== 'system');
      setAvailableForms(customForms);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoadingForms(false);
    }
  };

  const loadFormSchema = async (formName: string) => {
    setLoadingFormSchema(true);
    try {
      const schema = await formsAPI.getByName(formName);
      setSelectedFormSchema(schema);
    } catch (error) {
      console.error('Failed to load form schema:', error);
      setSelectedFormSchema(null);
    } finally {
      setLoadingFormSchema(false);
    }
  };

  const handleFormSelect = async (formName: string) => {
    handleChange('referenceFormName', formName);
    handleChange('referenceFieldName', ''); // Reset field selection
    await loadFormSchema(formName);
  };

  const handleApiEndpointChange = (endpoint: string) => {
    handleChange('apiEndpoint', endpoint);
    const referenceModel = availableEndpoints.find(e => e.value === endpoint)?.referenceModel;
    handleChange('referenceModel', referenceModel);
    
    handleChange('apiLabelField', ''); // Reset label field
    handleChange('apiValueField', '_id'); // Reset to default
  };

  const handleApiLabelFieldChange = (labelField: string) => {
    handleChange('apiLabelField', labelField);
  };

  const handleApiValueFieldChange = (valueField: string) => {
    handleChange('apiValueField', valueField);
  };

  const handleChange = (key: keyof FormField, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddOption = () => {
    if (newOptionLabel.trim() && newOptionValue.trim()) {
      const newOption: OptionItem = {
        label: newOptionLabel.trim(),
        value: newOptionValue.trim(),
      };
      
      // Convert existing string[] options to OptionItem[] if needed
      const currentOptions = formData.options || [];
      const normalizedOptions: OptionItem[] = currentOptions.map((opt) => {
        if (typeof opt === 'string') {
          return { label: opt, value: opt };
        }
        return opt;
      });
      
      handleChange('options', [...normalizedOptions, newOption]);
      setNewOptionLabel('');
      setNewOptionValue('');
    }
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      handleChange('options', newOptions);
    }
  };

  // Helper to normalize options for display
  const normalizeOptions = (options?: (OptionItem | string)[]): OptionItem[] => {
    if (!options) return [];
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  };

  const handleSave = () => {
    if (nameError) {
      return; // Don't save if there's a validation error
    }
    // For formReference type, validate that form and field are selected
    if (formData.type === 'formReference') {
      if (!formData.referenceFormName || !formData.referenceFieldName) {
        return; // Don't save if form reference is not configured
      }
    }
    // For apiReference type, validate that endpoint and label field are selected
    if (formData.type === 'apiReference') {
      if (!formData.apiEndpoint || !formData.apiLabelField) {
        return; // Don't save if API reference is not configured
      }
    }
    if (field && formData.type && formData.label && formData.name) {
      onSave(formData as FormField);
      onClose();
    }
  };


  const needsOptions = formData.type === 'select' || formData.type === 'radio';
  const isFormReference = formData.type === 'formReference';
  const isApiReference = formData.type === 'apiReference';
  const supportsMultiple = formData.type === 'select' || formData.type === 'formReference' || formData.type === 'apiReference' || formData.type === 'file';

  // Get available fields from selected form schema
  const getAvailableFields = (): FormField[] => {
    if (!selectedFormSchema) return [];
    // Get all fields from all sections
    return selectedFormSchema.sections?.flatMap(section => section.fields) ||
      selectedFormSchema.fields || [];
  };

  // Convert forms to OptionItem format for search
  const formOptions: OptionItem[] = availableForms.map((form) => ({
    label: `${form.title} (${form.name})`,
    value: form.name,
  }));

  // Convert fields to OptionItem format for search
  const fieldOptions: OptionItem[] = getAvailableFields().map((field) => ({
    label: `${field.label} (${field.name})`,
    value: field.name,
  }));

  // Convert endpoints to OptionItem format for search
  const endpointOptions: OptionItem[] = availableEndpoints.map((endpoint) => ({
    label: `${endpoint.label} (${endpoint.value})`,
    value: endpoint.value,
  }));

  return (
    <AppDrawer open={open} onClose={onClose} title="Field Configuration" anchor="right" width={400}>
      {field ? (
        <>
          <TextField
            label="Field Label"
            fullWidth
            size="small"
            value={formData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            margin="normal"
            required
          />

          <TextField
            label="Field Name"
            fullWidth
            size="small"
            value={formData.name || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('name', value);
              // Validate uniqueness if validator provided
              if (onValidateName && value) {
                if (!onValidateName(value)) {
                  setNameError('Field name must be unique across all sections');
                } else {
                  setNameError('');
                }
              } else {
                setNameError('');
              }
            }}
            margin="normal"
            required
            error={!!nameError}
            helperText={nameError || "Used as the field identifier (e.g., 'user_name')"}
          />

          <TextField
            label="Placeholder"
            fullWidth
            size="small"
            value={formData.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            margin="normal"
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.required || false}
                onChange={(e) => handleChange('required', e.target.checked)}
              />
            }
            label="Required Field"
            sx={{ mt: 2, mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.allowFilter || false}
                onChange={(e) => handleChange('allowFilter', e.target.checked)}
              />
            }
            label="Allow Filter"
          />

          {supportsMultiple && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowMultiple || false}
                  onChange={(e) => handleChange('allowMultiple', e.target.checked)}
                />
              }
              label="Allow Multiple Selection"
              sx={{ mt: 1 }}
            />
          )}

          {isFormReference && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Form Reference Configuration
              </Typography>
              <SearchableSelect
                label="Select Form"
                value={formData.referenceFormName || ''}
                onChange={handleFormSelect}
                options={formOptions}
                disabled={loadingForms}
                helperText="Select the form whose entries will populate this dropdown"
                loading={loadingForms}
                loadingText="Loading forms..."
                emptyText="No forms available"
                placeholder="Search forms..."
                margin="normal"
              />

              {formData.referenceFormName && (
                <SearchableSelect
                  label="Select Label Field"
                  value={formData.referenceFieldName || ''}
                  onChange={(value) => handleChange('referenceFieldName', value)}
                  options={fieldOptions}
                  disabled={loadingFormSchema || !selectedFormSchema}
                  helperText="Select which field from the referenced form to display as the label"
                  loading={loadingFormSchema}
                  loadingText="Loading form fields..."
                  emptyText="No fields available"
                  placeholder="Search fields..."
                  margin="normal"
                />
              )}

              {formData.referenceFormName && formData.referenceFieldName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  The dropdown will show entries from "{availableForms.find(f => f.name === formData.referenceFormName)?.title || formData.referenceFormName}",
                  displaying the "{getAvailableFields().find(f => f.name === formData.referenceFieldName)?.label || formData.referenceFieldName}" field as the label.
                  The record ID will be used as the value.
                </Typography>
              )}
            </Box>
          )}

          {isApiReference && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                API Reference Configuration
              </Typography>
              <SearchableSelect
                label="Select API Endpoint"
                value={formData.apiEndpoint || ''}
                onChange={handleApiEndpointChange}
                options={endpointOptions}
                helperText="Select the API endpoint to fetch data from"
                emptyText="No endpoints available"
                placeholder="Search endpoints..."
                margin="normal"
              />

              {formData.apiEndpoint && (
                <>
                  <TextField
                    label="Label Field"
                    fullWidth
                    size="small"
                    value={formData.apiLabelField || ''}
                    onChange={(e) => handleApiLabelFieldChange(e.target.value)}
                    margin="normal"
                    placeholder="e.g., name, title"
                    helperText="Field name from API response to display as label"
                  />

                  <TextField
                    label="Value Field"
                    fullWidth
                    size="small"
                    value={formData.apiValueField || '_id'}
                    onChange={(e) => handleApiValueFieldChange(e.target.value)}
                    margin="normal"
                    placeholder="_id"
                    helperText="Field name from API response to use as value (default: _id)"
                  />
                </>
              )}

            </Box>
          )}

          {needsOptions && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Options
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Label"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  placeholder="Value"
                  value={newOptionValue}
                  onChange={(e) => setNewOptionValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddOption();
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddOption}
                  startIcon={<AddIcon />}
                  disabled={!newOptionLabel.trim() || !newOptionValue.trim()}
                >
                  Add Option
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {normalizeOptions(formData.options).map((option, index) => (
                  <Chip
                    key={index}
                    label={`${option.label}: ${option.value}`}
                    onDelete={() => handleRemoveOption(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {formData.type === 'number' && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Min Value"
                type="number"
                fullWidth
                size="small"
                value={formData.validation?.min || ''}
                onChange={(e) =>
                  handleChange('validation', {
                    ...formData.validation,
                    min: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                margin="normal"
              />
              <TextField
                label="Max Value"
                type="number"
                fullWidth
                size="small"
                value={formData.validation?.max || ''}
                onChange={(e) =>
                  handleChange('validation', {
                    ...formData.validation,
                    max: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                margin="normal"
              />
            </Box>
          )}

          {formData.type === 'datepicker' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Date Picker Configuration
              </Typography>
              <RadioGroup
                value={formData.datePickerMode ?? (formData?.displayTime ? 'datetime' : 'date')}
                onChange={(e) => handleChange('datePickerMode', e.target.value as 'date' | 'datetime' | 'time')}
                sx={{ mt: 1 }}
              >
                <FormControlLabel value="date" control={<Radio size="small" />} label="Only date" />
                <FormControlLabel value="datetime" control={<Radio size="small" />} label="Date with time" />
                <FormControlLabel value="time" control={<Radio size="small" />} label="Only time" />
              </RadioGroup>
            </Box>
          )}

          {formData.type === 'file' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                File Upload Configuration
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowMultiple || false}
                    onChange={(e) => handleChange('allowMultiple', e.target.checked)}
                  />
                }
                label="Allow Multiple Files"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Max File Size (MB)"
                type="number"
                fullWidth
                size="small"
                value={formData.validation?.maxFileSize ? (formData.validation.maxFileSize / (1024 * 1024)).toFixed(2) : ''}
                onChange={(e) => {
                  const mbValue = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleChange('validation', {
                    ...formData.validation,
                    maxFileSize: mbValue ? Math.round(mbValue * 1024 * 1024) : undefined, // Convert MB to bytes
                  });
                }}
                margin="normal"
                inputProps={{ min: 0, step: 0.1 }}
                helperText="Maximum file size in megabytes (MB) per file"
              />
              <TextField
                label="Allowed File Types"
                fullWidth
                size="small"
                value={formData.validation?.allowedFileTypes?.join(', ') || ''}
                onChange={(e) => {
                  const types = e.target.value
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0)
                    .map(t => t.replace(/^\./, '')); // Remove leading dots
                  handleChange('validation', {
                    ...formData.validation,
                    allowedFileTypes: types.length > 0 ? types : undefined,
                  });
                }}
                margin="normal"
                placeholder="pdf, jpg, png, doc, docx"
                helperText="Comma-separated file extensions (e.g., pdf, jpg, png, doc, docx). Leave empty to allow all file types."
              />
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" spacing={2}>
            {/* <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                sx={{ flex: 1 }}
              >
                Delete
              </Button> */}
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              sx={{ flex: 1 }}
              disabled={
                !formData.label ||
                !formData.name ||
                (formData.type === 'formReference' && (!formData.referenceFormName || !formData.referenceFieldName)) ||
                (formData.type === 'apiReference' && (!formData.apiEndpoint || !formData.apiLabelField))
              }
            >
              Save
            </Button>
          </Stack>
        </>
      ) : (
        <Typography color="text.secondary">No field selected</Typography>
      )}
    </AppDrawer>
  );
};

