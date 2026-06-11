import {
  Drawer as MuiDrawer,
  Box,
  IconButton,
  Typography,
  Toolbar,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Anchor = 'left' | 'right' | 'top' | 'bottom';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  anchor?: Anchor;
}

export const AppDrawer = ({ 
  open, 
  onClose, 
  title, 
  children, 
  width = 400,
  anchor = 'right'
}: AppDrawerProps) => {
  const theme = useTheme();

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: width },
          boxSizing: 'border-box',
          borderRadius: 0,
          height: anchor === 'right' || anchor === 'left' ? '100%' : 'auto',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Toolbar
          sx={{
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </MuiDrawer>
  );
};

