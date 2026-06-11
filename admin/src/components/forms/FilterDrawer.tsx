import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Stack,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AppDrawer } from '@/components/common/AppDrawer';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { FormField, OptionItem } from '@/api/forms';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';

// Filter operator types
type FilterOperator = 
  | 'equals' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith'
  | 'greaterThan' 
  | 'lessThan' 
  | 'greaterThanOrEqual' 
  | 'lessThanOrEqual'
  | 'notEquals'
  | 'isEmpty'
  | 'isNotEmpty';

interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  fields: FormField[];
  filters: Record<string, any>;
  onApplyFilters: (filters: Record<string, any>) => void;
  onClearFilters: () => void;
  formReferenceMaps?: Record<string, Record<string, string>>; // Map of fieldName -> {entryId: label}
}

// Get available operators based on field type
const getOperatorsForFieldType = (fieldType: string): { value: FilterOperator; label: string }[] => {
  switch (fieldType) {
    case 'text':
    case 'email':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    
    case 'number':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'greaterThan', label: 'Greater Than' },
        { value: 'lessThan', label: 'Less Than' },
        { value: 'greaterThanOrEqual', label: 'Greater Than Or Equal' },
        { value: 'lessThanOrEqual', label: 'Less Than Or Equal' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    
    case 'datepicker':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'greaterThan', label: 'After' },
        { value: 'lessThan', label: 'Before' },
        { value: 'greaterThanOrEqual', label: 'On Or After' },
        { value: 'lessThanOrEqual', label: 'On Or Before' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    
    case 'select':
    case 'radio':
    case 'checkbox':
    case 'toggle':
    case 'formReference':
    case 'apiReference':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    
    default:
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
  }
};

// Check if operator requires a value input
const operatorRequiresValue = (operator: FilterOperator): boolean => {
  return !['isEmpty', 'isNotEmpty'].includes(operator);
};

export const FilterDrawer = ({
  open,
  onClose,
  fields,
  filters,
  onApplyFilters,
  onClearFilters,
  formReferenceMaps = {},
}: FilterDrawerProps) => {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

  // Convert filters object to filter conditions array on open
  useEffect(() => {
    if (open) {
      if (Object.keys(filters).length === 0) {
        // Start with one empty condition
        setFilterConditions([{ field: '', operator: 'equals', value: '' }]);
      } else {
        // Convert existing filters to conditions
        const conditions: FilterCondition[] = Object.entries(filters).map(([field, value]) => {
          // Try to parse if value is an object with operator
          if (typeof value === 'object' && value !== null && 'operator' in value) {
            return {
              field,
              operator: value.operator as FilterOperator,
              value: value.value,
            };
          }
          // Default to equals for simple values
          return {
            field,
            operator: 'equals' as FilterOperator,
            value,
          };
        });
        setFilterConditions(conditions.length > 0 ? conditions : [{ field: '', operator: 'equals', value: '' }]);
      }
    }
  }, [filters, open]);

  const handleAddCondition = () => {
    setFilterConditions([...filterConditions, { field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setFilterConditions(filterConditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, key: keyof FilterCondition, value: any) => {
    const updated = [...filterConditions];
    updated[index] = { ...updated[index], [key]: value };
    
    // Reset value when operator changes to one that doesn't require value
    if (key === 'operator' && !operatorRequiresValue(value)) {
      updated[index].value = '';
    }
    
    // Reset value when field changes
    if (key === 'field') {
      const field = fields.find(f => f.name === value);
      if (field) {
        const operators = getOperatorsForFieldType(field.type);
        updated[index].operator = operators[0]?.value || 'equals';
        updated[index].value = '';
      }
    }
    
    setFilterConditions(updated);
  };

  const handleApply = () => {
    // Convert filter conditions to filters object
    const filtersObj: Record<string, any> = {};
    
    filterConditions.forEach((condition) => {
      if (condition.field && condition.operator) {
        // Only include if operator requires value and value is provided, or operator doesn't require value
        if (operatorRequiresValue(condition.operator)) {
          if (condition.value !== '' && condition.value !== null && condition.value !== undefined) {
            filtersObj[condition.field] = {
              operator: condition.operator,
              value: condition.value,
            };
          }
        } else {
          filtersObj[condition.field] = {
            operator: condition.operator,
            value: null,
          };
        }
      }
    });
    
    onApplyFilters(filtersObj);
    onClose();
  };

  const handleClear = () => {
    setFilterConditions([{ field: '', operator: 'equals', value: '' }]);
    onClearFilters();
    onClose();
  };

  const renderValueInput = (condition: FilterCondition, index: number) => {
    if (!operatorRequiresValue(condition.operator)) {
      return null;
    }

    const field = fields.find(f => f.name === condition.field);
    if (!field) return null;

    const value = condition.value || '';

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <TextField
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <TextField
            type="number"
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value ? Number(e.target.value) : '')}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'select':
      case 'radio':
        const options = Array.isArray(field.options)
          ? field.options.map((opt) => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
          : [];
        return (
          <TextField
            select
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
          >
            <MenuItem value="">
              <em>Select value</em>
            </MenuItem>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );

      case 'formReference':
        // Get the reference map for this field
        const referenceMap = formReferenceMaps[field.name] || {};
        const referenceOptions = Object.entries(referenceMap).map(([entryId, label]) => ({
          value: entryId,
          label: label,
        }));
        return (
          <TextField
            select
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
            disabled={referenceOptions.length === 0}
          >
            <MenuItem value="">
              <em>Select value</em>
            </MenuItem>
            {referenceOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );

      case 'apiReference':
        // For apiReference, we'll need to fetch options dynamically
        // For now, use a text input - this could be enhanced to fetch options
        return (
          <TextField
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()} ID`}
            helperText="Enter the ID value from the API reference"
          />
        );

      case 'checkbox':
      case 'toggle':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value === true || value === 'true'}
                onChange={(e) => handleConditionChange(index, 'value', e.target.checked)}
              />
            }
            label={value === true || value === 'true' ? 'Yes' : 'No'}
          />
        );

      case 'datepicker':
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={value ? dayjs(value) : null}
              onChange={(newValue: Dayjs | null) => {
                handleConditionChange(index, 'value', newValue ? newValue.toISOString() : '');
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                },
              }}
            />
          </LocalizationProvider>
        );

      default:
        return (
          <TextField
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  const filterableFields = fields.filter((field) => field.allowFilter === true);
  
  // Convert filterable fields to OptionItem format for search
  const fieldOptions: OptionItem[] = useMemo(() => {
    const options = filterableFields.map((field) => ({
      label: field.label,
      value: field.name,
    }));
    // Add "Select Field" option at the beginning
    return options;
  }, [filterableFields]);

  const hasActiveFilters = filterConditions.some(
    (condition) => condition.field && condition.operator && (operatorRequiresValue(condition.operator) ? condition.value !== '' : true)
  );

  return (
    <AppDrawer open={open} onClose={onClose} title="Filter Entries" anchor="right" width={500}>
      {filterableFields.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No filterable fields available. Enable "Allow Filter" in field configuration to filter by that field.
        </Typography>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            {filterConditions.map((condition, index) => {
              const selectedField = fields.find(f => f.name === condition.field);
              const availableOperators = selectedField 
                ? getOperatorsForFieldType(selectedField.type)
                : getOperatorsForFieldType('text');

              return (
                <Box key={index} sx={{ mb: 3 }}>
                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Field Selection */}
                    <Grid item xs={12} sm={4}>
                      <SearchableSelect
                        label="Field"
                        value={condition.field}
                        onChange={(value) => handleConditionChange(index, 'field', value)}
                        options={fieldOptions}
                        emptyText="No fields available"
                        placeholder="Search fields..."
                        margin="none"
                      />
                    </Grid>

                    {/* Operator Selection */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="Operator"
                        fullWidth
                        size="small"
                        value={condition.operator}
                        onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                        disabled={!condition.field}
                      >
                        {availableOperators.map((op) => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Value Input */}
                    <Grid item xs={12} sm={3}>
                      {renderValueInput(condition, index)}
                    </Grid>

                    {/* Remove Button */}
                    <Grid item xs={12} sm={1}>
                      <IconButton
                        onClick={() => handleRemoveCondition(index)}
                        disabled={filterConditions.length === 1}
                        size="small"
                        color="error"
                        sx={{ mt: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>

                  {index < filterConditions.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              );
            })}
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddCondition}
            sx={{ mb: 2 }}
            fullWidth
          >
            Add Filter Condition
          </Button>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClear}
              disabled={!hasActiveFilters}
              sx={{ flex: 1 }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleApply}
              sx={{ flex: 1 }}
              disabled={!hasActiveFilters}
            >
              Apply Filters
            </Button>
          </Stack>
        </>
      )}
    </AppDrawer>
  );
};
