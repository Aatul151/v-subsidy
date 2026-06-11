import {
  Alert,
  AlertTitle,
  Snackbar,
  SnackbarOrigin,
  Box,
  IconButton,
  alpha,
} from '@mui/material';
import { useState, useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

interface AppAlertProps {
  open: boolean;
  onClose?: () => void;
  severity: AlertSeverity;
  message: string;
  title?: string;
  autoHideDuration?: number;
  position?: SnackbarOrigin;
}

const getSeverityStyles = (severity: AlertSeverity) => {
  const styles = {
    success: {
      bgcolor: alpha('#10b981', 1),
      borderColor: '#10b981',
      iconColor: '#ffffff',
      textColor: '#ffffff',
      icon: CheckCircleIcon,
    },
    error: {
      bgcolor: alpha('#ef4444', 1),
      borderColor: '#ef4444',
      iconColor: '#ffffff',
      textColor: '#ffffff',
      icon: ErrorIcon,
    },
    warning: {
      bgcolor: alpha('#f59e0b', 1),
      borderColor: '#f59e0b',
      iconColor: '#ffffff',
      textColor: '#ffffff',
      icon: WarningIcon,
    },
    info: {
      bgcolor: alpha('#3b82f6', 1),
      borderColor: '#3b82f6',
      iconColor: '#ffffff',
      textColor: '#ffffff',
      icon: InfoIcon,
    },
  };
  return styles[severity];
};

export const AppAlert = ({
  open,
  onClose,
  severity,
  message,
  title,
  autoHideDuration = 2000,
  position = { vertical: 'bottom', horizontal: 'right' },
}: AppAlertProps) => {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const severityStyles = getSeverityStyles(severity);
  const IconComponent = severityStyles.icon;

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={position || { vertical: 'bottom', horizontal: 'right' }}
      sx={{
        position: 'relative',
        transform: 'none !important',
        left: 'auto !important',
        right: 'auto !important',
        top: 'auto !important',
        bottom: 'auto !important',
        '& .MuiSnackbarContent-root': {
          minWidth: 'auto',
        },
      }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        sx={{
          width: '100%',
          maxWidth: 500,
          minWidth: 320,
          backgroundColor: severityStyles.bgcolor,
          border: `1px solid ${severityStyles.borderColor}`,
          borderRadius: 1,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          color: severityStyles.textColor,
          '& .MuiAlert-icon': {
            color: severityStyles.iconColor,
            fontSize: 24,
          },
          '& .MuiAlert-message': {
            color: severityStyles.textColor,
            fontWeight: 500,
            flex: 1,
          },
          '& .MuiAlert-action': {
            paddingTop: 0,
            alignItems: 'flex-start',
          },
          '& .MuiAlertTitle-root': {
            color: severityStyles.textColor,
            fontWeight: 600,
            marginBottom: 0.5,
          },
        }}
        icon={<IconComponent />}
        action={
          onClose && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
              sx={{
                color: severityStyles.textColor,
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                  backgroundColor: alpha(severityStyles.iconColor, 0.1),
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
      >
        {title && (
          <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
            {title}
          </AlertTitle>
        )}
        <Box component="span" sx={{ display: 'block' }}>
          {message}
        </Box>
      </Alert>
    </Snackbar>
  );
};

// Hook for easy usage - supports multiple alerts displayed horizontally
export const useAppAlert = () => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    severity: AlertSeverity;
    message: string;
    title?: string;
  }>>([]);

  const showAlert = (
    severity: AlertSeverity,
    message: string,
    title?: string
  ) => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    setAlerts((prev) => [...prev, { id, severity, message, title }]);
  };

  const hideAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return {
    showAlert,
    hideAlert,
    AlertComponent: (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column-reverse', // Reverse so newest appears at the bottom
          gap: 2,
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 1400, // Higher than Snackbar default z-index
          alignItems: 'flex-end',
        }}
      >
        {alerts.map((alert) => (
          <Box
            key={alert.id}
            sx={{
              maxWidth: 500,
              minWidth: 320,
              flexShrink: 0,
            }}
          >
            <AppAlert
              open={true}
              onClose={() => hideAlert(alert.id)}
              severity={alert.severity}
              message={alert.message}
              title={alert.title}
              autoHideDuration={2000}
            />
          </Box>
        ))}
      </Box>
    ),
  };
};

