import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { useAppAlert } from '@/components/common/AppAlert';
import { useSettingsStore } from '@/store/settingsStore';
import { FormContainer } from '@/components/form-builder/FormContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContent } from '@/components/common/PageContent';
import { Settings as SettingsIcon } from '@mui/icons-material';

export const Settings = () => {
  const { showAlert, AlertComponent } = useAppAlert();
  const { systemSettings, updateSystemSettings, isLoading, isInitialized } = useSettingsStore();
  const [formKey, setFormKey] = useState(0);

  // Create initial values from systemSettings with a new object reference
  const initialValues = useMemo(() => {
    if (isInitialized && systemSettings) {
      return { ...systemSettings };
    }
    return {};
  }, [isInitialized, systemSettings, formKey]);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      // Update settings in store (which will also save to API)
      await updateSystemSettings(data);
      showAlert('success', 'Settings saved successfully!');
      
      // Force form to remount by updating the key
      // This ensures the form displays the updated values
      setFormKey((prev) => prev + 1);

    } catch (error: any) {
      showAlert('error', error.response?.data?.message || 'Failed to save settings');
      throw error; // Re-throw to let FormContainer handle the error
    }
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
        title="Manage System Settings"
        icon="Settings"
        fallbackIcon={SettingsIcon}
        sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
      />

      <PageContent>
        <FormContainer
          key={formKey}
          variant="plain"
          formSysName="settings"
          onSubmit={handleSubmit}
          initialValues={initialValues}
          isLoading={isLoading}
          mode="edit"
        />
      </PageContent>
    </Box>
  );
};
