import { useState, useMemo } from 'react';
import {
  TextField,
  MenuItem,
  Box,
  Typography,
  InputAdornment,
  ListSubheader,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  OutlinedInput,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ComponentType } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: ComponentType<any>;
  group?: string;
}

interface AppSearchableSelectProps {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  multiple?: boolean;
  renderValue?: (value: string | string[]) => React.ReactNode;
  isLoading?: boolean;
  refresh?: () => void;
}

/**
 * AppSearchableSelect - A reusable searchable select component with single and multiple selection support
 * 
 * @param label - Label for the select field
 * @param value - Current selected value (string for single, string[] for multiple)
 * @param onChange - Callback when value changes
 * @param options - Array of options to display
 * @param placeholder - Placeholder text
 * @param helperText - Helper text below the field
 * @param fullWidth - Whether to take full width
 * @param size - Size of the select field
 * @param required - Whether the field is required
 * @param error - Whether to show error state
 * @param disabled - Whether the field is disabled
 * @param showSearch - Whether to show search input (default: true)
 * @param multiple - Whether to allow multiple selection (default: false)
 * @param renderValue - Custom render function for selected value
 * 
 * @example
 * // Single selection
 * <AppSearchableSelect
 *   label="Select Icon"
 *   value={selectedIcon}
 *   onChange={setSelectedIcon}
 *   options={iconOptions}
 * />
 * 
 * // Multiple selection
 * <AppSearchableSelect
 *   label="Select Icons"
 *   value={selectedIcons}
 *   onChange={setSelectedIcons}
 *   options={iconOptions}
 *   multiple
 * />
 */
export const AppSearchableSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Search and select...',
  helperText,
  fullWidth = true,
  size = 'small',
  required = false,
  error = false,
  disabled = false,
  showSearch = true,
  multiple = false,
  renderValue,
  isLoading = false,
  refresh,
}: AppSearchableSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return options.filter((option) => {
      const matchesLabel = option.label.toLowerCase().includes(lowerSearchTerm);
      const matchesValue = option.value.toLowerCase().includes(lowerSearchTerm);
      const matchesGroup = option.group?.toLowerCase().includes(lowerSearchTerm);
      return matchesLabel || matchesValue || matchesGroup;
    });
  }, [options, searchTerm]);

  // Group options by group if they have groups
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SearchableSelectOption[]> = {};
    const ungrouped: SearchableSelectOption[] = [];

    filteredOptions.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [filteredOptions]);

  // Normalize value based on multiple prop
  // IMPORTANT: All option values are strings, so normalize value to strings for proper matching
  const normalizedValue = useMemo(() => {
    if (multiple) {
      // For multiple: ensure it's an array of strings
      if (Array.isArray(value)) {
        return value.map(v => String(v));
      }
      // Convert single value to array if not null/undefined/empty
      if (value !== null && value !== undefined && value !== '') {
        return [String(value)];
      }
      return [];
    } else {
      // For single: ensure it's a string
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : '';
      }
      return value ? String(value) : '';
    }
  }, [value, multiple]);

  // Get selected options for custom rendering
  const selectedOptions = useMemo(() => {
    if (multiple) {
      const values = Array.isArray(normalizedValue) ? normalizedValue : [];
      // Ensure string comparison for matching
      return values.map((val) => options.find((opt) => String(opt.value) === String(val))).filter(Boolean) as SearchableSelectOption[];
    } else {
      // Ensure string comparison for matching
      const option = options.find((opt) => String(opt.value) === String(normalizedValue));
      return option ? [option] : [];
    }
  }, [options, normalizedValue, multiple]);

  // Custom render value function
  const defaultRenderValue = (val: string | string[]) => {
    if (multiple) {
      const values = Array.isArray(val) ? val : [];
      if (values.length === 0) {
        return <Typography variant="body2" color="text.secondary">{placeholder}</Typography>;
      }

      if (renderValue) {
        return renderValue(val);
      }

      // Render chips for multiple selection
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedOptions.map((option) => (
            <Chip
              key={option.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {option.icon && <option.icon sx={{ fontSize: 16 }} />}
                  <Typography variant="body2">{option.label}</Typography>
                </Box>
              }
              size="small"
            />
          ))}
        </Box>
      );
    } else {
      const singleValue = Array.isArray(val) ? val[0] : val;
      if (!singleValue) {
        return <Typography variant="body2" color="text.secondary">{placeholder}</Typography>;
      }

      if (renderValue) {
        return renderValue(singleValue);
      }

      const option = selectedOptions[0];
      if (option) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {option.icon && <option.icon sx={{ fontSize: 20 }} />}
            <Typography variant="body2">{option.label}</Typography>
          </Box>
        );
      }

      return <Typography variant="body2">{singleValue}</Typography>;
    }
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      required={required}
      error={error}
      disabled={disabled || isLoading}
    >
      {label && (
        <FormLabel required={required} error={error}>
          {label}
        </FormLabel>
      )}
      <Select
        multiple={multiple}
        value={normalizedValue}
        onChange={(e) => {
          const newValue = e.target.value;
          // Ensure we pass the correct type back
          onChange(newValue as string | string[]);
          // Clear search term when an option is selected
          setSearchTerm('');
          // For multiple selection, keep menu open; for single selection, close it
          if (!multiple) {
            setSelectOpen(false);
          }
        }}
        displayEmpty
        renderValue={() => defaultRenderValue(normalizedValue)}
        open={selectOpen}
        onOpen={() => {
          setSelectOpen(true);
        }}
        onClose={() => {
          // Clear search term when menu closes
          // Note: For multiple selection, menu stays open when selecting items
          // and only closes when clicking outside or pressing escape
          setSearchTerm('');
          setSelectOpen(false);
        }}
        disabled={disabled || isLoading}
        input={
          <OutlinedInput
            endAdornment={
              refresh ? (
                <InputAdornment position="end">
                  <Tooltip title="Refresh options" placement="bottom" arrow>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        refresh();
                      }}
                      disabled={isLoading || disabled}
                      edge="end"
                      sx={{ mr: 1 }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : undefined
            }
          />
        }
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 400,
            },
          },
          // Prevent menu from closing when clicking on search input
          disableAutoFocusItem: true,
        }}
      >
        {showSearch && (
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
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              onClick={(e) => {
                // Prevent menu from closing when clicking on search input
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                // Prevent menu from closing when clicking on search input
                e.stopPropagation();
              }}
              onBlur={(e) => {
                // When search input loses focus, check if focus moved to a menu item
                // Use setTimeout to allow click events on menu items to fire first
                setTimeout(() => {
                  const activeElement = document.activeElement;
                  const menuPaper = e.currentTarget?.closest('.MuiPaper-root');
                  // Only close if focus moved outside the menu
                  if (menuPaper && !menuPaper.contains(activeElement)) {
                    setSelectOpen(false);
                  }
                }, 100);
              }}
              onKeyDown={(e) => {
                // Prevent Select from handling keyboard events when typing in search
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setSearchTerm('');
                  setSelectOpen(false);
                }
                // Allow normal text input - don't let Select handle these keys
                if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                  e.stopPropagation();
                }
                // Allow Enter to select the first filtered option
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.stopPropagation();
                  e.preventDefault();
                  const firstOption = filteredOptions[0];
                  if (firstOption) {
                    if (multiple) {
                      // For multiple: add to existing selection
                      const currentValues = Array.isArray(normalizedValue) ? normalizedValue : [];
                      if (!currentValues.includes(firstOption.value)) {
                        onChange([...currentValues, firstOption.value]);
                      }
                    } else {
                      // For single: replace selection
                      onChange(firstOption.value);
                    }
                    setSearchTerm('');
                    setSelectOpen(false);
                  }
                }
              }}
              onKeyUp={(e) => {
                // Prevent Select from handling keyboard events when typing in search
                e.stopPropagation();
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

        {filteredOptions.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No options found' : 'No options available'}
            </Typography>
          </MenuItem>
        )}

        {/* Render ungrouped options first */}
        {groupedOptions.ungrouped.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {option.icon && <option.icon sx={{ fontSize: 20 }} />}
              <Typography variant="body2">{option.label}</Typography>
            </Box>
          </MenuItem>
        ))}

        {/* Render grouped options */}
        {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => [
          <ListSubheader key={`header-${groupName}`}>{groupName}</ListSubheader>,
          ...groupOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {option.icon && <option.icon sx={{ fontSize: 20 }} />}
                <Typography variant="body2">{option.label}</Typography>
              </Box>
            </MenuItem>
          )),
        ])}


      </Select>
      {helperText && (
        <FormHelperText error={error}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

