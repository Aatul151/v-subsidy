import { Box, Typography } from '@mui/material';
import { AppDynamicIcon } from './AppDynamicIcon';
import DescriptionIcon from '@mui/icons-material/Description';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  icon?: string | ReactNode;
  fallbackIcon?: React.ComponentType<any>;
  actions?: ReactNode;
  sx?: any;
}

/**
 * PageHeader - A reusable header component for pages
 * 
 * @param title - The page title
 * @param icon - Optional icon name (string) or ReactNode for custom icon
 * @param fallbackIcon - Optional fallback icon component (defaults to DescriptionIcon)
 * @param actions - Optional ReactNode for action buttons/controls
 * @param sx - Optional MUI sx prop for additional styling
 */
export const PageHeader = ({
  title,
  icon,
  fallbackIcon = DescriptionIcon,
  actions,
  sx,
}: PageHeaderProps) => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 2, sm: 0 },
        mb: 1,
        backgroundColor: 'background.paper',
        padding: 1.5,
        borderRadius: '10px',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: "5px" }}>
        {typeof icon === 'string' ? (
          <AppDynamicIcon
            iconName={icon}
            fallbackIcon={fallbackIcon}
            fontSize="small"
            color="primary"
          />
        ) : icon ? (icon) : (
          <AppDynamicIcon
            iconName={undefined}
            fallbackIcon={fallbackIcon}
            fontSize="small"
            color="primary"
          />
        )}
        <Typography variant="pageTitle">
          {title}
        </Typography>
      </Box>
      {actions && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'row' },
            gap: { xs: 1, sm: 2 },
            flexWrap: 'wrap',
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
};
