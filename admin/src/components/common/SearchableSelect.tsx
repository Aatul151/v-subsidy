import { useState } from 'react';
import {
  TextField,
  MenuItem,
  Typography,
  ListSubheader,
  InputAdornment,
  CircularProgress,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { OptionItem } from '@/api/forms';
import { filterOptions } from '@/utils/selectSearchUtils';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  margin?: 'none' | 'dense' | 'normal';
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Reusable searchable select component
 * Uses the common filterOptions function for consistent filtering
 */
export const SearchableSelect = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  helperText,
  placeholder = 'Search options...',
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No options available',
  margin = 'none',
  fullWidth = true,
  size = 'small',
}: SearchableSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);

  // Use common filterOptions function
  const filteredOptions = filterOptions(options, searchTerm);

  return (
    <TextField
      select
      label={label}
      fullWidth={fullWidth}
      size={size}
      value={value || ''}
      onChange={(e) => {
        onChange(e.target.value as string);
      }}
      margin={margin}
      disabled={disabled}
      helperText={helperText}
      SelectProps={{
        open: selectOpen,
        onOpen: () => setSelectOpen(true),
        onClose: () => {
          setSelectOpen(false);
          setSearchTerm('');
        },
        MenuProps: {
          PaperProps: {
            sx: {
              maxHeight: 400,
            },
          },
          disableAutoFocusItem: true,
        },
      }}
    >
      {!loading && options.length > 0 && (
        <ListSubheader
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'background.paper',
            zIndex: 1,
            padding: 1,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TextField
            fullWidth
            size="small"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                setSearchTerm('');
              }
            }}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              },
            }}
          />
        </ListSubheader>
      )}
      {loading ? (
        <MenuItem disabled>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            {loadingText}
          </Box>
        </MenuItem>
      ) : filteredOptions.length === 0 ? (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'No options found' : emptyText}
          </Typography>
        </MenuItem>
      ) : (
        filteredOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))
      )}
    </TextField>
  );
};
