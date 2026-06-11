import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, TextField, Button, Typography, Alert, Paper, Tabs, Tab, MenuItem, FormControlLabel, Switch, RadioGroup, Radio, FormControl } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import BuildIcon from '@mui/icons-material/Build';
import PreviewIcon from '@mui/icons-material/Preview';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { FieldTypePanel, regularFieldTypes, referenceFieldTypes } from '@/components/form-builder/FieldTypePanel';
import { FormCanvas } from '@/components/form-builder/FormCanvas';
import { FieldConfigDrawer } from '@/components/form-builder/FieldConfigDrawer';
import { SectionConfigDrawer } from '@/components/form-builder/SectionConfigDrawer';
import { useFormBuilderStore } from '@/store/formBuilderStore';
import { FormField, FormSchema, formEntriesAPI, FormEntry } from '@/api/forms';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { modulesAPI, Module } from '@/api/modulesApi';
import { useAppAlert } from '@/components/common/AppAlert';
import { SYSTEM_FORM_NAMES } from '@/utils/formUtils';
import { getIconSelectOptions } from '@/utils/iconMap';
import { AppSearchableSelect } from '@/components/common/AppSearchableSelect';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { useAuthStore, selectUserAndRoles   } from '@/store/authStore';
import { OptionItem } from '@/api/forms';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { FormContainer } from '@/components/form-builder/FormContainer';

export const FormBuilder = () => {
  const navigate = useNavigate();
  const { formName } = useParams<{ formName?: string }>();
  const {
    sections,
    selectedField,
    selectedFieldPath,
    currentForm,
    addSection,
    addField,
    updateField,
    removeField,
    removeSection,
    reorderFields,
    selectField,
    clearForm,
    saveForm,
    setCurrentForm,
    loadFormByName,
  } = useFormBuilderStore();

  // Form basic details state
  const [formDetails, setFormDetails] = useState<{
    title: string;
    name: string;
    module: string;
    formType: 'system' | 'custom';
    collectionName: string;
  }>({
    title: '',
    name: '',
    module: '',
    formType: 'custom',
    collectionName: '',
  });
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [sectionConfigDrawerOpen, setSectionConfigDrawerOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hasExpandedSection, setHasExpandedSection] = useState(false);
  const [formSettings, setFormSettings] = useState<Record<string, any>>({
    formIcon: '',
    isPublic: false,
    isSingleRecordForm: false,
    allowManageFromEntryPage: false,
    fieldsPerRow: 1,
    sectionDisplayMode: 'panel',
  });
  const { showAlert, AlertComponent } = useAppAlert();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthStore(selectUserAndRoles);

  // Memoize icon options - must be at component level, not inside conditional render
  const iconSelectOptions = useMemo(() => {
    const iconOptions = getIconSelectOptions();
    // Add "None" option at the beginning
    return [
      { value: '', label: 'None', icon: undefined, group: undefined },
      ...iconOptions,
    ];
  }, []);

  // Use ref to store latest showAlert function to avoid infinite loops
  const showAlertRef = useRef(showAlert);
  useEffect(() => {
    showAlertRef.current = showAlert;
  }, [showAlert]);

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: modulesAPI.getModules,
  });

  // Fetch collections from form entries
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['formEntries', SYSTEM_FORM_NAMES.COLLECTION],
    queryFn: async () => {
      try {
        const response = await formEntriesAPI.getAll({
          formName: SYSTEM_FORM_NAMES.COLLECTION,
          page: 1,
          limit: 1000, // Get all collections
        });
        return response.data || [];
      } catch (error) {
        // If collection form doesn't exist yet, return empty array
        return [];
      }
    },
  });

  // Extract collection names from form entries
  const collections = collectionsData || [];

  // Convert modules to OptionItem format for search
  const moduleOptions: OptionItem[] = useMemo(() => {
    return modules.map((module: Module) => ({
      label: module.name,
      value: module._id,
    }));
  }, [modules]);

  // Convert collections to OptionItem format for search
  const collectionOptions: OptionItem[] = useMemo(() => {
    const options = collections
      .map((entry: FormEntry) => {
        // Extract collection name from payload.collection or payload.name
        const collectionName = entry.payload?.collection || entry.payload?.name || '';
        if (!collectionName) return null;
        return {
          label: collectionName,
          value: collectionName,
        };
      })
      .filter((item): item is OptionItem => item !== null);
    
    // Add "None" option at the beginning
    return options;
  }, [collections]);

  // Select first section if none selected
  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  // Set selected section when field is selected
  useEffect(() => {
    if (selectedFieldPath) {
      setSelectedSectionId(selectedFieldPath.sectionId);
    }
  }, [selectedFieldPath]);

  useEffect(() => {
    if (currentForm) {
      setFormDetails({
        title: currentForm.title,
        name: currentForm.name,
        module: (currentForm.module as Module)?._id || '',
        formType: currentForm.formType || 'custom',
        collectionName: currentForm.collectionName || '',
      });
      // Load form settings
      setFormSettings(currentForm.settings || { formIcon: '', isPublic: false, isSingleRecordForm: false, allowManageFromEntryPage: false, fieldsPerRow: 1, sectionDisplayMode: 'panel' });
    }
  }, [currentForm]);

  // Load form by name from URL parameter
  useEffect(() => {
    if (formName) {
      const decodedFormName = decodeURIComponent(formName);
      loadFormByName(decodedFormName).catch((error: any) => {
        showAlertRef.current('error', error.response?.data?.message || 'Failed to load form');
      });
    } else {
      // If no formName, clear the form to start fresh
      clearForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formName]); // Only depend on formName to avoid infinite loops

  // Clear form instance when component unmounts (page leave)
  useEffect(() => {
    return () => {
      // Cleanup: clear form when leaving the page
      clearForm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount/unmount

  // Generate form name from title
  const handleFormTitleChange = (title: string) => {
    // Auto-generate form name from title (lowercase, replace spaces with underscores)
    const generatedName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    setFormDetails((prev) => ({
      ...prev,
      title,
      name: generatedName || 'new_form',
    }));
  };

  const [prevSectionsLength, setPrevSectionsLength] = useState(sections.length);

  const handleAddSection = () => {
    const sectionNumber = sections.length + 1;
    addSection({ title: `Section ${sectionNumber}` });
  };

  // Select the newly added section when sections array grows
  useEffect(() => {
    if (sections.length > prevSectionsLength && sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      setSelectedSectionId(lastSection.id);
    }
    setPrevSectionsLength(sections.length);
  }, [sections.length, prevSectionsLength]);

  // Check if field name is unique across all sections
  const isFieldNameUnique = (fieldName: string, excludeSectionId?: string, excludeFieldIndex?: number): boolean => {
    const normalizedName = fieldName.toLowerCase().trim();
    return sections.every((section) => {
      if (excludeSectionId && section.id === excludeSectionId) {
        return section.fields.every((field, index) => {
          if (excludeFieldIndex !== undefined && index === excludeFieldIndex) return true;
          return field.name.toLowerCase().trim() !== normalizedName;
        });
      }
      return section.fields.every((field) => field.name.toLowerCase().trim() !== normalizedName);
    });
  };

  const handleAddField = (type: FormField['type']) => {
    // Add to selected section or first section
    const targetSectionId = selectedSectionId || sections[0]?.id;
    if (!targetSectionId) {
      // Create a section if none exists
      addSection({ title: 'Section 1' });
      return;
    }

    const allFields = sections.flatMap(s => s.fields);
    let fieldName = `field_${allFields.length + 1}`;
    let counter = 1;

    // Ensure unique field name
    while (!isFieldNameUnique(fieldName)) {
      fieldName = `field_${allFields.length + counter}`;
      counter++;
    }

    const newField: FormField = {
      type,
      label: `New ${type}`,
      name: fieldName,
      required: false,
    };

    // Add default options for select and radio
    if (type === 'select' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2'];
    }

    addField(targetSectionId, newField);
  };

  const handleFieldSelect = (field: FormField, sectionId: string, fieldIndex: number) => {
    selectField(field, sectionId, fieldIndex);
    setSelectedSectionId(sectionId);
    setConfigDrawerOpen(true);
  };

  const handleFieldConfigSave = (field: FormField) => {
    if (selectedFieldPath) {
      // Validate field name uniqueness
      if (!isFieldNameUnique(field.name, selectedFieldPath.sectionId, selectedFieldPath.fieldIndex)) {
        setSaveError(`Field name "${field.name}" already exists. Field names must be unique across all sections.`);
        return;
      }
      updateField(selectedFieldPath.sectionId, selectedFieldPath.fieldIndex, field);
      selectField(null);
      setConfigDrawerOpen(false);
    }
  };

  const handleSectionEdit = (sectionId: string) => {
    setEditingSectionId(sectionId);
    setSectionConfigDrawerOpen(true);
  };

  const handleFieldDelete = (sectionId: string, fieldIndex: number) => {
    removeField(sectionId, fieldIndex);
    if (selectedFieldPath?.sectionId === sectionId && selectedFieldPath?.fieldIndex === fieldIndex) {
      setConfigDrawerOpen(false);
      selectField(null);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    if (!formDetails.name.trim()) {
      setSaveError('Form name is required');
      return;
    }

    // Validate form name format (lowercase, alphanumeric and underscores only)
    const namePattern = /^[a-z0-9_]+$/;
    if (!namePattern.test(formDetails.name)) {
      setSaveError('Form name must contain only lowercase letters, numbers, and underscores');
      return;
    }

    if (!formDetails.module) {
      setSaveError('Please select a module');
      return;
    }

    const totalFields = sections.reduce((sum, section) => sum + section.fields.length, 0);
    if (totalFields === 0) {
      setSaveError('Please add at least one field to the form');
      return;
    }

    try {
      setCurrentForm({
        ...currentForm,
        title: formDetails.title,
        name: formDetails.name?.toString()?.toLowerCase()?.trim(),
        module: formDetails.module,
        formType: formDetails.formType,
        collectionName: formDetails.collectionName?.toString()?.trim() || undefined,
        sections,
        settings: formSettings,
      } as any);
      await saveForm();
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false)
        // Navigate back to previous page
        navigate(-1);
      }, 1000);

      // Invalidate forms query to update sidebar menu
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    } catch (error: any) {
      setSaveError(error.response?.data?.message || 'Failed to save form');
    }
  };

  const handleCancel = () => {
    clearForm();
    setCurrentForm(null);
    // Navigate back to previous page
    navigate(-1);
  };

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
        title="Form Builder"
        icon="Build"
        fallbackIcon={BuildIcon}
        actions={
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Save
            </Button>
          </>
        }
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 1.5 }}>
        {/* Alerts */}
        {saveError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSaveSuccess(false)}>
            Form saved successfully!
          </Alert>
        )}

        {/* Form Basic Details */}
        <Paper sx={{ p: 1.5, mb: 1.5, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600, color: 'text.secondary' }}>
          Form Basic Details
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Form Title"
              fullWidth
              size="small"
              value={formDetails.title}
              onChange={(e) => handleFormTitleChange(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Form Name"
              fullWidth
              size="small"
              value={formDetails.name}
              onChange={(e) => {
                const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                setFormDetails((prev) => ({ ...prev, name: value }));
              }}
              helperText="Unique identifier (lowercase)"
              required
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              select
              label="Form Type"
              fullWidth
              size="small"
              value={formDetails.formType}
              onChange={(e) => setFormDetails((prev) => ({ ...prev, formType: e.target.value as 'system' | 'custom' }))}
              helperText="System forms won't appear in sidebar menu"
              disabled={!isSuperAdmin}
            >
              <MenuItem value="custom">Custom</MenuItem>
              {isSuperAdmin && <MenuItem value="system">System</MenuItem>}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <SearchableSelect
              label="Module"
              value={formDetails.module}
              onChange={(value) => setFormDetails((prev) => ({ ...prev, module: value }))}
              options={moduleOptions}
              disabled={modulesLoading}
              loading={modulesLoading}
              loadingText="Loading modules..."
              emptyText="No modules available"
              placeholder="Search modules..."
              helperText={saveError && !formDetails.module ? 'Module is required' : 'Select a module'}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <SearchableSelect
              label="Collection"
              value={formDetails.collectionName}
              onChange={(value) => setFormDetails((prev) => ({ ...prev, collectionName: value }))}
              options={collectionOptions}
              disabled={collectionsLoading}
              loading={collectionsLoading}
              loadingText="Loading collections..."
              emptyText="No collections available"
              placeholder="Search collections..."
              helperText="Database collection (optional)"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Area - Tabbed content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', mt: 1.5 }}>
        <Paper sx={{ flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                padding: '6px 12px',
                fontSize: '0.8125rem',
              },
            }}
          >
            <Tab icon={<BuildIcon />} iconPosition="start" label="Form Canvas" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Settings" />
            <Tab icon={<PreviewIcon />} iconPosition="start" label="Preview" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', mt: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, flexGrow: 1, minHeight: 0, overflow: 'hidden', height: '100%' }}>
              {/* Left Sidebar - Add Section & Field Types - Fixed */}
              <Paper
                sx={{
                  width: 240,
                  flexShrink: 0,
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  position: 'relative'
                }}
              >
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddSection}
                  sx={{ mb: 1.5, flexShrink: 0 }}
                >
                  Add Section
                </Button>
                <Box sx={{ flexGrow: 1, overflow: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider', minHeight: 0 }}>
                  <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600, color: 'text.secondary' }}>
                    Field Types
                  </Typography>
                  <FieldTypePanel
                    fieldTypes={regularFieldTypes}
                    onAddField={handleAddField}
                    disabled={sections.length === 0 || !hasExpandedSection}
                  />
                </Box>
              </Paper>

              {/* Middle - Form Canvas - Scrollable */}
              <Box
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  overflow: 'auto',
                  height: '100%',
                  position: 'relative'
                }}
              >
                <FormCanvas
                  sections={sections}
                  onFieldSelect={handleFieldSelect}
                  onFieldDelete={handleFieldDelete}
                  onFieldReorder={reorderFields}
                  selectedField={selectedField}
                  selectedSectionId={selectedSectionId}
                  onSectionSelect={setSelectedSectionId}
                  onSectionEdit={handleSectionEdit}
                  onSectionDelete={(sectionId) => {
                    removeSection(sectionId);
                  }}
                  onExpandedSectionsChange={setHasExpandedSection}
                />
              </Box>

              {/* Right Sidebar - Reference Types - Fixed */}
              <Paper
                sx={{
                  width: 200,
                  flexShrink: 0,
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  position: 'relative',
                  borderLeft: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600, color: 'text.secondary' }}>
                  Reference Types
                </Typography>
                <FieldTypePanel
                  fieldTypes={referenceFieldTypes}
                  onAddField={handleAddField}
                  disabled={sections.length === 0 || !hasExpandedSection}
                />
              </Paper>
            </Box>
          )}

          {activeTab === 1 && (
            <Paper sx={{ p: 2, overflow: 'auto', maxHeight: '100%' }}>
              <Typography variant="caption" sx={{ mb: 2, display: 'block', fontWeight: 600, color: 'text.secondary' }}>
                Form Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <AppSearchableSelect
                    label="Form Icon"
                    value={formSettings.formIcon || ''}
                    onChange={(value) => {
                      setFormSettings((prev) => ({
                        ...prev,
                        formIcon: value,
                      }));
                    }}
                    options={iconSelectOptions}
                    placeholder=""
                    helperText="Search and select an icon for the form"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    label="Fields Per Row"
                    value={formSettings.fieldsPerRow || 1}
                    onChange={(e) => {
                      setFormSettings((prev) => ({
                        ...prev,
                        fieldsPerRow: parseInt(e.target.value, 10),
                      }));
                    }}
                    fullWidth
                    size="small"
                    helperText="Number of fields to display per row (1-3)"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value={1}>1 Field</option>
                    <option value={2}>2 Fields</option>
                    <option value={3}>3 Fields</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                      row
                      value={formSettings.sectionDisplayMode || 'panel'}
                      onChange={(e) => {
                        setFormSettings((prev) => ({
                          ...prev,
                          sectionDisplayMode: e.target.value,
                        }));
                      }}
                    >
                      <FormControlLabel value="panel" control={<Radio size="small" />} label="Panel" />
                      <FormControlLabel value="stepper" control={<Radio size="small" />} label="Stepper" />
                    </RadioGroup>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Choose how sections are displayed: Panel (accordion) or Stepper (step-by-step)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 0', minWidth: 280 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formSettings.isPublic || false}
                            onChange={(e) => {
                              setFormSettings((prev) => ({
                                ...prev,
                                isPublic: e.target.checked,
                              }));
                            }}
                          />
                        }
                        label="Public Form"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 4 }}>
                        When enabled, this form can be accessed publicly without authentication
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 280 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formSettings.isSingleRecordForm || false}
                            onChange={(e) => {
                              setFormSettings((prev) => ({
                                ...prev,
                                isSingleRecordForm: e.target.checked,
                              }));
                            }}
                          />
                        }
                        label="Is Single Record Form"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 4 }}>
                        When enabled, the form entries page will open directly in edit mode instead of showing the datatable
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formSettings.allowManageFromEntryPage || false}
                        onChange={(e) => {
                          setFormSettings((prev) => ({
                            ...prev,
                            allowManageFromEntryPage: e.target.checked,
                          }));
                        }}
                      />
                    }
                    label="Allow Manage From Entry Page"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 4 }}>
                    When enabled, the form creator can access the settings icon in the form entries page to edit the form definition
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {activeTab === 2 && (
            <Paper sx={{ p: 1.5, overflow: 'auto', maxHeight: '100%' }}>
              {sections.some(s => s.fields.length > 0) ? (
                <FormContainer
                  formSchema={{
                    title: formDetails.title,
                    name: formDetails.name,
                    sections,
                  } as FormSchema}
                  variant="plain"
                  onSubmit={() => { return Promise.resolve(); }}
                  isLoading={false}
                  onSuccess={() => { return Promise.resolve(); }}
                  mode="view"
                />
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No fields added yet. Add fields to see the preview.
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      </Box>
      </PageContent>

      <FieldConfigDrawer
        open={configDrawerOpen}
        onClose={() => {
          setConfigDrawerOpen(false);
          selectField(null);
        }}
        field={selectedField}
        fieldIndex={selectedFieldPath?.fieldIndex ?? null}
        onSave={handleFieldConfigSave}
        onDelete={() => {
          if (selectedFieldPath) {
            handleFieldDelete(selectedFieldPath.sectionId, selectedFieldPath.fieldIndex);
          }
        }}
        onValidateName={(name) => {
          if (selectedFieldPath) {
            return isFieldNameUnique(name, selectedFieldPath.sectionId, selectedFieldPath.fieldIndex);
          }
          return isFieldNameUnique(name);
        }}
      />

      <SectionConfigDrawer
        open={sectionConfigDrawerOpen}
        onClose={() => {
          setSectionConfigDrawerOpen(false);
          setEditingSectionId(null);
        }}
        section={editingSectionId ? sections.find(s => s.id === editingSectionId) || null : null}
        onSave={(updates) => {
          if (editingSectionId) {
            const { updateSection } = useFormBuilderStore.getState();
            updateSection(editingSectionId, updates);
            setSectionConfigDrawerOpen(false);
            setEditingSectionId(null);
          }
        }}
      />
    </Box>
  );
};

