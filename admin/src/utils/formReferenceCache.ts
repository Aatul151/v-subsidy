import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formEntriesAPI, FormEntry, OptionItem } from '@/api/forms';
import { apiReferenceService } from './apiReferenceService';

/**
 * Hook to get cached form reference options
 * @param referenceFormName - Name of the form to reference
 * @param referenceFieldName - Field name from the referenced form to use as label
 * @param enabled - Whether to fetch (default: true)
 * @returns Object with options, isLoading, and refresh function
 */
export const useFormReferenceOptions = (
  referenceFormName: string | undefined,
  referenceFieldName: string | undefined,
  enabled: boolean = true
) => {
  const queryKey = referenceFormName && referenceFieldName
    ? ['formReferenceOptions', referenceFormName, referenceFieldName]
    : null;

  const query = useQuery({
    queryKey: queryKey || ['formReferenceOptions', 'disabled'],
    queryFn: async () => {
      if (!referenceFormName || !referenceFieldName) return [];

      try {
        // Fetch all entries for the referenced form - only fetch _id and the label field for optimization
        const fieldsToSelect = ['_id', `payload.${referenceFieldName}`];
        const response = await formEntriesAPI.getAll({
          formName: referenceFormName,
          page: 1,
          limit: 1000,
          fields: fieldsToSelect,
        });
        const entries = response.data || [];

        // Extract options from entries
        const options: OptionItem[] = entries.map((entry: FormEntry) => {
          const labelValue = entry.payload?.[referenceFieldName] ||
            entry[referenceFieldName] ||
            `Entry ${entry._id?.substring(0, 8) || 'Unknown'}`;
          return {
            label: String(labelValue),
            value: entry._id || '',
          };
        });

        return options;
      } catch (error) {
        console.error(`Failed to load form entries for ${referenceFormName}:`, error);
        return [];
      }
    },
    enabled: enabled && !!referenceFormName && !!referenceFieldName && !!queryKey,
    staleTime: 10 * 60 * 1000, // Data is fresh for 10 min, then marked stale
    gcTime: 15 * 60 * 1000, // Unused cache kept for 15 min after unmount
    // Note: React Query doesn't auto-refetch just because data is stale
    // It only refetches on: component mount, window focus, network reconnect, or manual refresh
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: false, // Don't refetch on window focus (set globally in App.tsx)
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    if (queryKey) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  return {
    options: query.data || [],
    isLoading: query.isLoading || query.isFetching,
    refresh,
  };
};

/**
 * Hook to get cached API reference options
 * @param apiEndpoint - API endpoint path
 * @param apiLabelField - Field name to use as label
 * @param apiValueField - Field name to use as value (default: '_id')
 * @param enabled - Whether to fetch (default: true)
 * @returns Object with options, isLoading, and refresh function
 */
export const useApiReferenceOptions = (
  apiEndpoint: string | undefined,
  apiLabelField: string | undefined,
  apiValueField: string = '_id',
  enabled: boolean = true
) => {
  const queryKey = apiEndpoint && apiLabelField
    ? ['apiReferenceOptions', apiEndpoint, apiLabelField, apiValueField]
    : null;

  const query = useQuery({
    queryKey: queryKey || ['apiReferenceOptions', 'disabled'],
    queryFn: async () => {
      if (!apiEndpoint || !apiLabelField) return [];

      try {
        const options = await apiReferenceService.fetchOptions(
          apiEndpoint,
          apiLabelField,
          apiValueField
        );
        return options;
      } catch (error) {
        console.error(`Failed to load API options for ${apiEndpoint}:`, error);
        return [];
      }
    },
    enabled: enabled && !!apiEndpoint && !!apiLabelField && !!queryKey,
    staleTime: 10 * 60 * 1000, // Data is fresh for 10 min, then marked stale
    gcTime: 15 * 60 * 1000, // Unused cache kept for 15 min after unmount
    // Note: React Query doesn't auto-refetch just because data is stale
    // It only refetches on: component mount, window focus, network reconnect, or manual refresh
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnWindowFocus: false, // Don't refetch on window focus (set globally in App.tsx)
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    if (queryKey) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  return {
    options: query.data || [],
    isLoading: query.isLoading || query.isFetching,
    refresh,
  };
};

/**
 * Invalidate all form reference options for a specific form
 * Call this when form entries are created/updated/deleted
 */
export const invalidateFormReferenceOptions = (formName: string, queryClient: any) => {
  queryClient.invalidateQueries({
    queryKey: ['formReferenceOptions', formName],
  });
};

/**
 * Invalidate all API reference options for a specific endpoint
 * Call this when API data changes
 */
export const invalidateApiReferenceOptions = (endpoint: string, queryClient: any) => {
  queryClient.invalidateQueries({
    queryKey: ['apiReferenceOptions', endpoint],
  });
};

