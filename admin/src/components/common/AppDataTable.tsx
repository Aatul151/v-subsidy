import { Box, SxProps, Theme, Typography, useTheme, alpha, Card, CardContent, IconButton, useMediaQuery, Pagination, Stack, Menu, MenuItem, Checkbox, TextField, InputAdornment } from '@mui/material';
import {
  DataGrid,
  DataGridProps,
  GridPaginationModel,
  GridValidRowModel,
  GridColumnMenu,
  GridColumnMenuProps,
  GridColDef,
  GridRowSelectionModel,
  GridFilterModel,
} from '@mui/x-data-grid';
import InboxIcon from '@mui/icons-material/Inbox';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useState, useMemo, useEffect } from 'react';

// Common Empty State Component - Reusable with customizable messages
interface EmptyStateOverlayProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

const EmptyStateOverlay = ({ title, message, icon }: EmptyStateOverlayProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
          }}
        >
          {icon || (
            <InboxIcon
              sx={{
                fontSize: 40,
                color: theme.palette.primary.main,
              }}
            />
          )}
        </Box>
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.disabled,
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          {message}
        </Typography>
      </Box>
    </Box>
  );
};

// Custom Empty State Component - Shows when no rows are found
const CustomNoRowsOverlay = () => (
  <EmptyStateOverlay
    title="No data found"
    message="Start by adding your first item to get started."
  />
);

// Custom No Results Overlay - Shows when filtering/searching returns no results
const CustomNoResultsOverlay = () => (
  <EmptyStateOverlay
    title="No results found"
    message="Try adjusting your filters or search terms to find what you're looking for."
  />
);

// Helper function to filter rows based on global search term
const filterRowsBySearchTerm = <R extends GridValidRowModel>(
  rows: R[],
  columns: GridColDef[],
  searchTerm: string,
  getRowId?: (row: R) => string | number
): R[] => {
  if (!searchTerm.trim()) {
    return rows;
  }

  const searchLower = searchTerm.toLowerCase().trim();

  return rows.filter((row) => {
    // Check each column for matches
    return columns.some((column) => {
      // Skip Record No and Actions columns
      if (column.field === '__recordNo__' || column.type === 'actions') {
        return false;
      }

      // Get cell value using valueGetter if available
      let cellValue: any;
      try {
        const apiRef = {
          current: {
            getRowId: (r: R) => getRowId ? String(getRowId(r)) : String(r),
            getSortedRows: () => rows,
            getSortedRowIds: () => rows.map((r) => getRowId ? String(getRowId(r)) : String(r)),
          },
        };

        if (column.valueGetter) {
          const valueGetter = column.valueGetter as (value: any, row: R, column: GridColDef, apiRef: any) => any;
          cellValue = valueGetter(null, row, column, apiRef);
        } else if (column.valueFormatter) {
          const fieldValue = row[column.field as keyof R];
          const valueFormatter = column.valueFormatter as (value: any, row: R, column: GridColDef, apiRef: any) => any;
          cellValue = valueFormatter(fieldValue, row, column, apiRef);
        } else {
          cellValue = row[column.field as keyof R];
        }

        // Convert to string and check if it contains the search term
        const cellValueStr = cellValue !== null && cellValue !== undefined
          ? String(cellValue).toLowerCase()
          : '';

        return cellValueStr.includes(searchLower);
      } catch {
        // Fallback to direct field access
        const fieldValue = row[column.field as keyof R];
        const fieldValueStr = fieldValue !== null && fieldValue !== undefined
          ? String(fieldValue).toLowerCase()
          : '';
        return fieldValueStr.includes(searchLower);
      }
    });
  });
};

// Custom Column Menu - Shows "Manage Columns" and optionally "Filter" option
// Hides Sort option
const CustomColumnMenu = (props: GridColumnMenuProps & { enableFilter?: boolean }) => {
  const { enableFilter = false, ...restProps } = props;

  // Build slots object conditionally
  const slots: any = {
    columnMenuSortItem: null, // Hide Sort option
    // columnMenuColumnsItem is included by default (Manage Columns)
  };

  // Only hide Filter option if not enabled
  if (!enableFilter) {
    slots.columnMenuFilterItem = null;
  }

  return (
    <GridColumnMenu
      {...restProps}
      slots={slots}
    />
  );
};

export interface AppDataTableProps<R extends GridValidRowModel = any> extends Omit<DataGridProps<R>, 'sx' | 'paginationMode' | 'rowCount' | 'paginationModel' | 'onPaginationModelChange' | 'initialState' | 'pageSizeOptions' | 'checkboxSelection' | 'rowSelectionModel' | 'onRowSelectionModelChange' | 'filterModel' | 'onFilterModelChange'> {
  /**
   * Height of the table container (default: 600)
   */
  height?: number | string;
  /**
   * Additional sx styles to merge with default styles
   */
  sx?: SxProps<Theme>;
  /**
   * Page size options (default: [10, 25, 50, 100])
   */
  pageSizeOptions?: number[];
  /**
   * Initial page size for client-side pagination (default: 10)
   */
  initialPageSize?: number;
  /**
   * Enable server-side pagination
   */
  serverPagination?: boolean;
  /**
   * Total row count for server-side pagination (required when serverPagination is true)
   */
  rowCount?: number;
  /**
   * Pagination model for server-side pagination (required when serverPagination is true)
   */
  paginationModel?: GridPaginationModel;
  /**
   * Callback when pagination model changes (for server-side pagination)
   */
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  /**
   * Enable row selection (default: false)
   */
  allowRowSelection?: boolean;
  /**
   * Callback when selected rows change
   * @param selectedRows Array of selected row objects
   */
  onSelectedRows?: (selectedRows: R[]) => void;
  /**
   * Enable column filtering (default: false)
   */
  enableFiltering?: boolean;
  /**
   * Filter model for server-side filtering (optional)
   */
  filterModel?: GridFilterModel;
  /**
   * Callback when filter model changes (for server-side filtering)
   */
  onFilterModelChange?: (model: GridFilterModel) => void;
  /**
   * Enable global search across all fields (default: true)
   * Note: Search works client-side only, filtering the rows that are currently loaded
   */
  enableGlobalSearch?: boolean;
  /**
   * Placeholder text for global search input
   */
  globalSearchPlaceholder?: string;
}

// Mobile Card View Component
interface MobileCardViewProps<R extends GridValidRowModel> {
  rows: R[];
  columns: GridColDef[];
  loading?: boolean;
  getRowId?: (row: R) => string | number;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowCount?: number;
  serverPagination?: boolean;
  theme: Theme;
  allowRowSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
  columnVisibilityModel?: Record<string, boolean>;
  globalSearchTerm?: string;
}

const MobileCardView = <R extends GridValidRowModel = any>({
  rows,
  columns,
  loading,
  getRowId,
  paginationModel,
  onPaginationModelChange,
  rowCount,
  serverPagination,
  theme,
  allowRowSelection = false,
  rowSelectionModel,
  onRowSelectionModelChange,
  columnVisibilityModel,
  globalSearchTerm = '',
}: MobileCardViewProps<R>) => {
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  // Filter out recordNo and actions columns for display
  // Also filter based on columnVisibilityModel - only show visible columns
  const displayColumns = columns.filter((col) => {
    // Always hide Record No column in mobile view
    if (col.field === '__recordNo__') return false;
    // Always show Actions column if it exists
    if (col.type === 'actions') return false;

    // Check visibility model - if column is explicitly hidden (false), don't show it
    // If not in visibility model or set to true/undefined, show it (default visible)
    if (columnVisibilityModel && columnVisibilityModel[col.field] === false) {
      return false;
    }

    return true;
  });
  const actionsColumn = columns.find((col) => col.type === 'actions') as GridColDef & { getActions?: (params: any) => React.ReactNode[] };

  // Calculate pagination
  const currentPage = paginationModel?.page || 0;
  const pageSize = paginationModel?.pageSize || 10;

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    if (onPaginationModelChange) {
      onPaginationModelChange({
        page: page - 1, // MUI Pagination is 1-based, GridPaginationModel is 0-based
        pageSize,
      });
    }
  };

  const handleActionMenuOpen = (rowId: string, event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor((prev) => ({ ...prev, [rowId]: event.currentTarget }));
  };

  const handleActionMenuClose = (rowId: string) => {
    setActionMenuAnchor((prev) => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
  };

  const handleRowSelectionChange = (rowId: string | number, checked: boolean) => {
    if (!onRowSelectionModelChange || !rowSelectionModel) return;

    const rowIdString = String(rowId);
    let currentIds: Set<string>;

    if (rowSelectionModel.type === 'include') {
      // For 'include' type: use the existing included IDs (convert to strings)
      currentIds = new Set(Array.from(rowSelectionModel.ids).map(String));
    } else {
      // For 'exclude' type: convert to 'include' by getting all row IDs minus excluded ones
      // Get all row IDs
      const allRowIds = rows.map((row: R) => {
        if (getRowId) {
          return String(getRowId(row));
        }
        return String((row as any).id || row);
      });

      // Get excluded IDs
      const excludedIds = Array.from(rowSelectionModel.ids);

      // Convert to included IDs (all IDs that are NOT excluded)
      currentIds = new Set(allRowIds.filter((id: string) => !excludedIds.includes(id)));
    }

    // Now update the selection
    if (checked) {
      currentIds.add(rowIdString);
    } else {
      currentIds.delete(rowIdString);
    }

    // Always use 'include' type for consistency
    onRowSelectionModelChange({
      type: 'include',
      ids: currentIds,
    });
  };

  const isRowSelected = (rowId: string | number): boolean => {
    if (!rowSelectionModel) return false;

    const rowIdString = String(rowId);
    const rowIdNumber = typeof rowId === 'number' ? rowId : Number(rowId);
    const isNumericId = !isNaN(rowIdNumber) && isFinite(rowIdNumber);

    if (rowSelectionModel.type === 'include') {
      // For 'include' type: row is selected if it's in the ids set
      // Check both string and number formats to handle both cases
      return rowSelectionModel.ids.has(rowIdString) ||
        (isNumericId && rowSelectionModel.ids.has(rowIdNumber)) ||
        rowSelectionModel.ids.has(rowId);
    } else {
      // For 'exclude' type: row is selected if it's NOT in the excluded ids set
      // Check both string and number formats
      const isExcluded = rowSelectionModel.ids.has(rowIdString) ||
        (isNumericId && rowSelectionModel.ids.has(rowIdNumber)) ||
        rowSelectionModel.ids.has(rowId);
      return !isExcluded;
    }
  };

  const renderCellValue = (row: R, column: GridColDef, rowId: string): React.ReactNode => {
    // Create apiRef once for reuse
    const apiRef = {
      current: {
        getRowId: (r: R) => getRowId ? String(getRowId(r)) : String(r),
        getSortedRows: () => rows,
        getSortedRowIds: () => rows.map((r) => getRowId ? String(getRowId(r)) : String(r)),
      },
    };

    // First, get the value using valueGetter if available (same as DataGrid does)
    let cellValue: any;
    if (column.valueGetter) {
      try {
        const valueGetter = column.valueGetter as (value: any, row: R, column: GridColDef, apiRef: any) => any;
        cellValue = valueGetter(null, row, column, apiRef);
      } catch {
        cellValue = row[column.field as keyof R];
      }
    } else if (column.valueFormatter) {
      const fieldValue = row[column.field as keyof R];
      const valueFormatter = column.valueFormatter as (value: any, row: R, column: GridColDef, apiRef: any) => any;
      cellValue = valueFormatter(fieldValue, row, column, apiRef);
    } else {
      cellValue = row[column.field as keyof R];
    }

    // If renderCell is defined, use it (for custom rendering like chips, icons, etc.)
    // Pass the value from valueGetter to renderCell, just like DataGrid does
    if (column.renderCell) {
      try {
        const params = {
          row,
          id: rowId,
          field: column.field,
          value: cellValue, // Use the value from valueGetter, not raw row value
          api: apiRef,
          colDef: column,
          cellMode: 'view' as const,
          hasFocus: false,
          tabIndex: -1,
        };
        const renderCell = column.renderCell as (params: any) => React.ReactNode;
        return renderCell(params);
      } catch (error) {
        console.warn('Error rendering cell:', error);
        // Fall through to default rendering
      }
    }

    // Default rendering: return formatted value as string or React node
    return cellValue !== null && cellValue !== undefined ? String(cellValue) : '-';
  };

  // Filter rows by global search term (client-side only)
  // IMPORTANT: This hook must be called before any early returns to maintain hook order
  const filteredRows = useMemo(() => {
    if (!globalSearchTerm.trim()) {
      return rows;
    }
    return filterRowsBySearchTerm(rows, columns, globalSearchTerm, getRowId);
  }, [rows, columns, globalSearchTerm, getRowId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (filteredRows.length === 0 && !loading) {
    return globalSearchTerm.trim() ? <CustomNoResultsOverlay /> : <CustomNoRowsOverlay />;
  }

  // Get current page rows
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageRows = serverPagination ? filteredRows : filteredRows.slice(startIndex, endIndex);

  // Update total pages calculation - use filtered rows count for client-side, rowCount for server-side
  const totalPages = serverPagination && rowCount
    ? Math.ceil(rowCount / pageSize)
    : Math.ceil(filteredRows.length / pageSize);

  // Calculate select all state for current page
  const getSelectAllState = () => {
    if (!allowRowSelection || currentPageRows.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const currentPageRowIds = currentPageRows.map((row: R) => {
      if (getRowId) {
        return String(getRowId(row));
      }
      return String((row as any)._id || row);
    });

    let selectedCount = 0;
    currentPageRowIds.forEach((rowId: string) => {
      if (isRowSelected(rowId)) {
        selectedCount++;
      }
    });

    const checked = selectedCount === currentPageRowIds.length && currentPageRowIds.length > 0;
    const indeterminate = selectedCount > 0 && selectedCount < currentPageRowIds.length;

    return { checked, indeterminate };
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onRowSelectionModelChange || !rowSelectionModel) return;

    const currentPageRowIds = currentPageRows.map((row: R) => {
      if (getRowId) {
        return String(getRowId(row));
      }
      return String((row as any).id || row);
    });

    let updatedIds: Set<string>;

    if (rowSelectionModel.type === 'include') {
      // For 'include' type: add/remove current page row IDs
      updatedIds = new Set(Array.from(rowSelectionModel.ids).map(String));
      currentPageRowIds.forEach((rowId: string) => {
        if (checked) {
          updatedIds.add(rowId);
        } else {
          updatedIds.delete(rowId);
        }
      });
    } else {
      // For 'exclude' type: convert to 'include' first
      // Get all row IDs
      const allRowIds = rows.map((row: R) => {
        if (getRowId) {
          return String(getRowId(row));
        }
        return String((row as any).id || row);
      });

      // Get currently selected IDs (all IDs minus excluded ones)
      const excludedIds = Array.from(rowSelectionModel.ids);
      const currentlySelected = allRowIds.filter((id: string) => !excludedIds.includes(String(id)));

      updatedIds = new Set(currentlySelected.map(String));

      // Update current page rows
      currentPageRowIds.forEach((rowId: string) => {
        if (checked) {
          updatedIds.add(rowId);
        } else {
          updatedIds.delete(rowId);
        }
      });
    }

    onRowSelectionModelChange({
      type: 'include',
      ids: updatedIds,
    });
  };

  const selectAllState = getSelectAllState();

  // Calculate selected count for display
  const getSelectedCount = () => {
    if (!allowRowSelection || currentPageRows.length === 0) return 0;
    const currentPageRowIds = currentPageRows.map((row: R) => {
      if (getRowId) {
        return String(getRowId(row));
      }
      return String((row as any).id || row);
    });
    return currentPageRowIds.filter((rowId: string) => isRowSelected(rowId)).length;
  };
  const selectedCount = getSelectedCount();

  return (
    <Box>
      {/* Select All Header */}
      {allowRowSelection && currentPageRows.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 2,
            mb: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <Checkbox
            checked={selectAllState.checked}
            indeterminate={selectAllState.indeterminate}
            onChange={(e) => handleSelectAll(e.target.checked)}
            size="small"
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            Select All ({selectedCount} of {currentPageRows.length} selected)
          </Typography>
        </Box>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        {currentPageRows.map((row, index) => {
          const rowId = getRowId ? String(getRowId(row)) : String(index);
          const actions = actionsColumn?.getActions
            ? actionsColumn.getActions({ row, id: rowId } as any)
            : [];
          const actionMenuOpen = Boolean(actionMenuAnchor[rowId]);
          const isOddRow = index % 2 === 0; // index 0, 2, 4... are odd rows (1st, 3rd, 5th...)

          return (
            <Card
              key={rowId}
              sx={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                // Striped background for odd rows
                backgroundColor: isOddRow
                  ? theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.03)
                    : alpha(theme.palette.common.black, 0.02)
                  : 'transparent',
                ...(allowRowSelection && isRowSelected(rowId) && {
                  border: `2px solid ${theme.palette.primary.main}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }),
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {allowRowSelection && (
                      <Checkbox
                        checked={isRowSelected(rowId)}
                        onChange={(e) => handleRowSelectionChange(rowId, e.target.checked)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      #{serverPagination && paginationModel
                        ? paginationModel.page * paginationModel.pageSize + index + 1
                        : startIndex + index + 1}
                    </Typography>
                  </Box>
                  {actions.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleActionMenuOpen(rowId, e)}
                      sx={{ p: 0.5 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Stack spacing={1.5}>
                  {displayColumns.map((column) => {
                    const cellContent = renderCellValue(row, column, rowId);

                    return (
                      <Box key={column.field}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            display: 'block',
                            mb: 0.5,
                          }}
                        >
                          {column.headerName || column.field}
                        </Typography>
                        <Box
                          sx={{
                            color: 'text.primary',
                            fontSize: '0.875rem',
                            wordBreak: 'break-word',
                            '& .MuiChip-root': {
                              height: 24,
                              fontSize: '0.75rem',
                            },
                          }}
                        >
                          {cellContent}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Actions Menu */}
                {actions.length > 0 && (
                  <Menu
                    anchorEl={actionMenuAnchor[rowId]}
                    open={actionMenuOpen}
                    onClose={() => handleActionMenuClose(rowId)}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    {actions.map((action: any, idx: number) => {
                      if (action && typeof action === 'object' && 'props' in action) {
                        const actionProps = action.props as any;
                        return (
                          <MenuItem
                            key={idx}
                            onClick={() => {
                              actionProps.onClick?.();
                              handleActionMenuClose(rowId);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            {actionProps.icon}
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {actionProps.label}
                            </Typography>
                          </MenuItem>
                        );
                      }
                      return null;
                    })}
                  </Menu>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage + 1}
            onChange={handlePageChange}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

/**
 * Common DataTable component with standardized styling and pagination
 * Wraps Material-UI DataGrid with consistent defaults
 * On mobile, displays cards instead of table
 */
export const AppDataTable = <R extends GridValidRowModel = any>({
  height = 600,
  pageSizeOptions = [5, 10, 25, 50, 100],
  initialPageSize = 10,
  serverPagination = false,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  allowRowSelection = false,
  onSelectedRows,
  enableGlobalSearch = true,
  globalSearchPlaceholder = 'Search all fields...',
  sx,
  ...dataGridProps
}: AppDataTableProps<R>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');

  // Extract rows and getRowId early for use in selectedRecordIds calculation
  const dataGridPropsAny = dataGridProps as any;
  const { rows: allRows, getRowId: getRowIdFn } = dataGridPropsAny;

  // Derive selectedRecordIds array from rowSelectionModel
  const selectedRecordIds = useMemo(() => {
    if (rowSelectionModel.type === 'include') {
      return Array.from(rowSelectionModel.ids);
    }

    // For 'exclude' type: selected = all row IDs - excluded IDs
    if (rowSelectionModel.type === 'exclude' && allRows) {
      // Get all row IDs
      const allRowIds = allRows.map((row: R) => {
        if (getRowIdFn) {
          return String(getRowIdFn(row));
        }
        return String((row as any).id || row);
      });

      // Get excluded IDs
      const excludedIds = Array.from(rowSelectionModel.ids);

      // Return all IDs that are NOT in the excluded set
      return allRowIds.filter((id: string) => !excludedIds.includes(id));
    }

    return [];
  }, [rowSelectionModel, allRows, getRowIdFn]);

  // Derive selectedRows array from selectedRecordIds
  const selectedRows = useMemo(() => {
    if (!allRows || selectedRecordIds.length === 0) {
      return [];
    }

    // Filter rows that match selected IDs
    return allRows.filter((row: R) => {
      const rowId = getRowIdFn ? String(getRowIdFn(row)) : String((row as any).id || row);
      return selectedRecordIds.includes(rowId) || selectedRecordIds.includes(Number(rowId));
    });
  }, [selectedRecordIds, allRows, getRowIdFn]);

  const handleRowSelectionModelChange = (model: GridRowSelectionModel) => {
    setRowSelectionModel(model);
  };

  useEffect(() => {
    if (onSelectedRows) {
      onSelectedRows(selectedRows);
    }
  }, [selectedRows, onSelectedRows])

  // Default styles that are applied to all tables
  const defaultSx: SxProps<Theme> = {
    // Remove border radius from DataGrid root and container
    borderRadius: 0,
    '& .MuiDataGrid-root': {
      borderRadius: 0,
    },
    '& .MuiDataGrid-main': {
      borderRadius: 0,
    },
    '& .MuiDataGrid-container--top': {
      borderRadius: 0,
    },
    '& .MuiDataGrid-container--bottom': {
      borderRadius: 0,
    },
    '& .MuiDataGrid-cell': {
      borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      // Default: left align text content
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    // Center align for record number column
    '& .MuiDataGrid-cell[data-field="__recordNo__"]': {
      textAlign: 'center',
      justifyContent: 'center',
    },
    // Striped rows - odd rows have a subtle background
    '& .MuiDataGrid-row:nth-of-type(odd)': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.02)
        : alpha(theme.palette.primary.main, 0.02),
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.primary.main, 0.15)
          : alpha(theme.palette.primary.main, 0.08),
      },
      '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.25),
        },
      },
    },
    '& .MuiDataGrid-row:nth-of-type(even)': {
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.primary.main, 0.15)
          : alpha(theme.palette.primary.main, 0.08),
      },
      '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.25),
        },
      },
    },
  };

  // Merge user-provided sx with defaults
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;

  // Build pagination props based on mode
  // Note: We'll merge pagination initialState separately with column visibility
  const paginationProps = serverPagination
    ? {
      paginationMode: 'server' as const,
      rowCount: rowCount || 0,
      paginationModel: paginationModel,
      onPaginationModelChange: onPaginationModelChange,
    }
    : {
      // Pagination initialState will be merged with column visibility in mergedInitialState
    };

  // Build slots prop - merge custom noRowsOverlay, noResultsOverlay, and columnMenu with any existing slots
  // Extract slots from dataGridProps if they exist (dataGridPropsAny already defined above)
  const existingSlots = dataGridPropsAny.slots;
  const slots = {
    noRowsOverlay: CustomNoRowsOverlay, // Empty table - "Start by adding your first item"
    noResultsOverlay: CustomNoResultsOverlay, // Filtered results - "Try adjusting your filters"
    columnMenu: CustomColumnMenu, // Custom column menu with only "Manage Columns" option
    ...(existingSlots || {}),
  };

  // Extract columns and add Record No column as first column
  // dataGridPropsAny already defined above
  const { columns: originalColumns, slots: _, disableColumnMenu, disableColumnSorting, initialState: existingInitialState, ...restDataGridProps } = dataGridPropsAny;

  // Create Record No column
  const recordNoColumn: GridColDef = {
    field: '__recordNo__',
    headerName: 'No',
    width: 70,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    valueGetter: (_value, row, _column, apiRef) => {
      const currentRowId = apiRef.current.getRowId(row);

      // Calculate record number based on pagination
      if (serverPagination && paginationModel) {
        // Server-side pagination: (page * pageSize) + indexInCurrentPage + 1
        // For server-side, DataGrid only has rows for current page
        const page = paginationModel.page;
        const pageSize = paginationModel.pageSize;

        // Get all rows (which are only the current page's rows for server-side)
        const currentPageRows = apiRef.current.getSortedRows();
        const indexInCurrentPage = currentPageRows.findIndex((r) => {
          const rowId = apiRef.current.getRowId(r);
          return rowId === currentRowId;
        });

        return (page * pageSize) + indexInCurrentPage + 1;
      } else {
        // Client-side pagination: Get absolute index from all sorted row IDs
        // This gives us the position across all data, not just current page
        const allSortedRowIds = apiRef.current.getSortedRowIds();
        const absoluteIndex = allSortedRowIds.findIndex((id) => id === currentRowId);

        // Return absolute position (1-based)
        return absoluteIndex + 1;
      }
    },
  };

  // Prepend Record No column to the columns array
  const columnsWithRecordNo: GridColDef[] = originalColumns
    ? [recordNoColumn, ...originalColumns]
    : [recordNoColumn];

  // Build default column visibility model - hide columns beyond first 8 data columns by default
  // Exclude "No" (Record No) and "Actions" columns from the count
  const defaultColumnVisibilityModel = useMemo(() => {
    const visibilityModel: Record<string, boolean> = {};
    const maxVisibleDataColumns = 8; // Show first 8 data columns (excluding No and Actions)

    // Filter out Record No and Actions columns to count only data columns
    const dataColumns = columnsWithRecordNo.filter(
      (col) => col.field !== '__recordNo__' && col.type !== 'actions'
    );

    // Track which data columns should be visible
    const visibleDataColumnFields = new Set(
      dataColumns.slice(0, maxVisibleDataColumns).map((col) => col.field)
    );

    // Set visibility for all columns
    columnsWithRecordNo.forEach((column) => {
      // Always show Record No and Actions columns
      if (column.field === '__recordNo__' || column.type === 'actions') {
        // Keep visible (don't set in visibilityModel means visible)
        return;
      }

      // Hide data columns beyond the first 8
      if (!visibleDataColumnFields.has(column.field)) {
        visibilityModel[column.field] = false;
      }
    });

    return visibilityModel;
  }, [columnsWithRecordNo]);

  // Initialize column visibility state with default model merged with user-provided initialState
  // Use useMemo to ensure it only recalculates when columns change
  const initialColumnVisibilityModel = useMemo(() => {
    return {
      ...defaultColumnVisibilityModel,
      ...(existingInitialState?.columns?.columnVisibilityModel || {}),
    };
  }, [defaultColumnVisibilityModel, existingInitialState?.columns?.columnVisibilityModel]);

  // State for column visibility - initialized once and persists across re-renders and page changes
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>(
    initialColumnVisibilityModel
  );

  // Merge column visibility with existing initialState
  // Also include pagination initialState for client-side pagination
  const mergedInitialState = {
    ...(existingInitialState || {}),
    ...(serverPagination ? {} : {
      pagination: {
        ...(existingInitialState?.pagination || {}),
        paginationModel: {
          pageSize: initialPageSize,
          ...(existingInitialState?.pagination?.paginationModel || {}),
        },
      },
    }),
  };

  // Extract rows and other props for mobile view
  const { rows, loading, getRowId } = restDataGridProps as any;

  // Handle global search change (client-side only)
  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearchTerm(value);
  };

  // Filter rows client-side (always works, regardless of pagination mode)
  const filteredRows = useMemo(() => {
    if (!globalSearchTerm.trim() || !enableGlobalSearch) {
      return rows || [];
    }
    return filterRowsBySearchTerm(rows || [], columnsWithRecordNo, globalSearchTerm, getRowId);
  }, [rows, columnsWithRecordNo, globalSearchTerm, enableGlobalSearch, getRowId]);

  // On mobile, show card view
  if (isMobile) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Global Search Input */}
        {enableGlobalSearch && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={globalSearchPlaceholder}
              value={globalSearchTerm}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {globalSearchTerm ? (
                      <IconButton
                        size="small"
                        onClick={() => handleGlobalSearchChange('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    <SearchIcon sx={{ mr: 1 }} fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.05)
                    : alpha(theme.palette.common.black, 0.02),
                },
              }}
            />
            {/* Show filtered count below search box in mobile view */}
            {globalSearchTerm.trim() && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredRows.length} of {rows?.length || 0} results
                </Typography>
              </Box>
            )}
          </Box>
        )}
        <MobileCardView
          rows={filteredRows}
          columns={columnsWithRecordNo}
          loading={loading}
          getRowId={getRowId}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          rowCount={serverPagination ? rowCount : filteredRows.length}
          serverPagination={serverPagination}
          theme={theme}
          allowRowSelection={allowRowSelection}
          rowSelectionModel={allowRowSelection ? rowSelectionModel : undefined}
          onRowSelectionModelChange={allowRowSelection ? handleRowSelectionModelChange : undefined}
          columnVisibilityModel={columnVisibilityModel}
          globalSearchTerm={globalSearchTerm}
        />
      </Box>
    );
  }

  // On desktop, show DataGrid
  return (
    <Box sx={{ height, width: '100%', borderRadius: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Global Search Input - Right aligned with small width */}
      {enableGlobalSearch && (
        <Box sx={{ mb: 2, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {/* Show filtered count on left side */}
          <Box sx={{ flex: 1 }}>
            {globalSearchTerm.trim() && (
              <Typography variant="body2" color="text.secondary">
                Showing {filteredRows.length} of {rows?.length || 0} results
              </Typography>
            )}
          </Box>
          {/* Search input on right side - always positioned on right */}
          <TextField
            size="small"
            placeholder={globalSearchPlaceholder}
            value={globalSearchTerm}
            onChange={(e) => handleGlobalSearchChange(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {globalSearchTerm ? (
                    <IconButton
                      size="small"
                      onClick={() => handleGlobalSearchChange('')}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  <InputAdornment position="end" sx={{ mr: globalSearchTerm ? 0 : 1 }}>
                    <SearchIcon sx={{ mr: 1 }} fontSize="small" color="primary" />
                  </InputAdornment>
                </InputAdornment>
              ),
            }}
            sx={{
              width: 300,
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.05)
                  : alpha(theme.palette.common.black, 0.02),
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          {...restDataGridProps}
          rows={filteredRows}
          columns={columnsWithRecordNo}
          {...paginationProps}
          rowCount={serverPagination ? rowCount : filteredRows.length}
          initialState={mergedInitialState}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
          pageSizeOptions={pageSizeOptions}
          sx={mergedSx}
          slots={slots}
          density="compact"
          // Enable column menu by default (includes Hide Column and Sort options)
          // Only set if not explicitly provided by user
          disableColumnMenu={disableColumnMenu !== undefined ? disableColumnMenu : false}
          // Enable column sorting by default
          // Only set if not explicitly provided by user
          disableColumnSorting={disableColumnSorting !== undefined ? disableColumnSorting : false}
          // Row selection
          checkboxSelection={allowRowSelection}
          disableRowSelectionOnClick={true} // Disable row click selection, only allow checkbox selection
          rowSelectionModel={allowRowSelection ? rowSelectionModel : undefined}
          onRowSelectionModelChange={allowRowSelection ? handleRowSelectionModelChange : undefined}
        />
      </Box>
    </Box>
  );
};
