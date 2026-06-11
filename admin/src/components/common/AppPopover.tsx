import { ReactNode, useState, ReactElement, cloneElement } from 'react';
import { Popover, PopoverProps, Box, Typography, SxProps, Theme } from '@mui/material';

export interface AppPopoverProps extends Omit<PopoverProps, 'open' | 'anchorEl' | 'onClose'> {
  /**
   * The element that triggers the popover when clicked
   */
  trigger: ReactElement;
  
  /**
   * Content to display inside the popover
   */
  children: ReactNode;
  
  /**
   * Title to display at the top of the popover (optional)
   */
  title?: string;
  
  /**
   * Maximum width of the popover
   */
  maxWidth?: number | string;
  
  /**
   * Maximum height of the popover
   */
  maxHeight?: number | string;
  
  /**
   * Padding for the popover content
   */
  padding?: number | string;
  
  /**
   * Custom styles for the popover paper
   */
  paperSx?: SxProps<Theme>;
  
  /**
   * Custom styles for the content box
   */
  contentSx?: SxProps<Theme>;
  
  /**
   * Whether to prevent event propagation on click
   */
  stopPropagation?: boolean;
  
  /**
   * Callback when popover opens
   */
  onOpen?: () => void;
  
  /**
   * Callback when popover closes
   */
  onClose?: () => void;
}

/**
 * AppPopover - A reusable popover component
 * 
 * @example
 * <AppPopover
 *   trigger={<Button>Open</Button>}
 *   title="Files"
 *   maxWidth={300}
 * >
 *   <Box>Content here</Box>
 * </AppPopover>
 */
export const AppPopover = ({
  trigger,
  children,
  title,
  maxWidth = 300,
  maxHeight = 400,
  padding = 1.5,
  paperSx,
  contentSx,
  stopPropagation = true,
  onOpen,
  onClose,
  anchorOrigin = {
    vertical: 'bottom',
    horizontal: 'left',
  },
  transformOrigin = {
    vertical: 'top',
    horizontal: 'left',
  },
  ...popoverProps
}: AppPopoverProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    setAnchorEl(event.currentTarget);
    if (onOpen) {
      onOpen();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    if (onClose) {
      onClose();
    }
  };

  const open = Boolean(anchorEl);

  // Clone the trigger element and add onClick handler
  const triggerElement = cloneElement(trigger, {
    onClick: handleOpen,
  });

  return (
    <>
      {triggerElement}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        onClick={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
        }}
        PaperProps={{
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            if (stopPropagation) {
              e.stopPropagation();
            }
          },
          sx: {
            maxWidth,
            maxHeight,
            overflow: 'auto',
            ...paperSx,
          },
        }}
        {...popoverProps}
      >
        <Box sx={{ p: padding, ...contentSx }}>
          {title && (
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {title}
            </Typography>
          )}
          {children}
        </Box>
      </Popover>
    </>
  );
};

