import { useMemo } from 'react';
import { OptionItem } from '@/api/forms';

/**
 * Normalizes options to OptionItem format
 * Handles both string[] and OptionItem[] formats
 */
export const normalizeOptions = (options?: OptionItem[] | string[]): OptionItem[] => {
  if (!options) return [];
  return options.map((opt) => {
    return typeof opt === 'string' ? { label: opt, value: opt } : opt;
  });
};

/**
 * Filters options based on search term
 * Searches both label and value fields (case-insensitive)
 */
export const filterOptions = (options: OptionItem[], searchTerm: string): OptionItem[] => {
  if (!searchTerm.trim()) {
    return options;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  return options.filter((option) => {
    const matchesLabel = option?.label?.toLowerCase()?.includes(lowerSearchTerm);
    // const matchesValue = String(option?.value)?.toLowerCase()?.includes(lowerSearchTerm);
    return matchesLabel;
  });
};

/**
 * Hook to normalize and filter options based on search term
 */
export const useSearchableOptions = (
  options: OptionItem[] | string[] | undefined,
  searchTerm: string
) => {
  const normalizedOptions = useMemo(() => {
    return normalizeOptions(options);
  }, [options]);

  const filteredOptions = useMemo(() => {
    return filterOptions(normalizedOptions, searchTerm);
  }, [normalizedOptions, searchTerm]);

  return { normalizedOptions, filteredOptions };
};
