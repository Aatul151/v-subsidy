import { useState, useEffect } from 'react';
import DescriptionIcon from '@mui/icons-material/Description';
import { getIconFromMap } from '@/utils/iconMap';

// Cache for dynamically loaded icons to avoid re-importing
const iconCache: Record<string, React.ComponentType<any>> = {};

interface AppDynamicIconProps {
  iconName: string | undefined;
  fallbackIcon?: React.ComponentType<any>;
  className?: string;
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
  color?: 'inherit' | 'action' | 'disabled' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  sx?: any;
}

/**
 * AppDynamicIcon - A utility component that dynamically loads MUI icons at runtime
 * 
 * @param iconName - The name of the MUI icon (e.g., "SettingsIcon", "PeopleIcon")
 * @param fallbackIcon - Optional fallback icon component (defaults to DescriptionIcon)
 * @param className - Optional CSS class name
 * @param fontSize - Optional icon font size
 * @param color - Optional icon color
 * @param sx - Optional MUI sx prop for styling
 * 
 * @example
 * <AppDynamicIcon iconName="SettingsIcon" />
 * <AppDynamicIcon iconName="PeopleIcon" fontSize="large" color="primary" />
 */
export const AppDynamicIcon = ({ 
  iconName, 
  fallbackIcon = DescriptionIcon,
  className,
  fontSize,
  color,
  sx
}: AppDynamicIconProps) => {
  const [IconComponent, setIconComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadIcon = () => {
      if (!iconName) {
        setIconComponent(() => fallbackIcon);
        setIsLoading(false);
        return;
      }

      // Check cache first
      if (iconCache[iconName]) {
        setIconComponent(() => iconCache[iconName]);
        setIsLoading(false);
        return;
      }

      // Try to get icon from the icon map first (static imports - works with Vite)
      const iconFromMap = getIconFromMap(iconName);
      if (iconFromMap) {
        // Cache the icon
        iconCache[iconName] = iconFromMap;
        setIconComponent(() => iconFromMap);
        setIsLoading(false);
        return;
      }

      // If not found in map, fallback to default icon
      // (You can add dynamic import here if needed, but static map is preferred for Vite)
      console.warn(`Icon "${iconName}" not found in icon map. Using fallback icon. Add it to src/utils/iconMap.tsx to use it.`);
      setIconComponent(() => fallbackIcon);
      setIsLoading(false);
    };

    loadIcon();
  }, [iconName, fallbackIcon]);

  if (isLoading || !IconComponent) {
    const Fallback = fallbackIcon;
    return <Fallback className={className} fontSize={fontSize} color={color} sx={sx} />;
  }

  return <IconComponent className={className} fontSize={fontSize} color={color} sx={sx} />;
};

/**
 * Helper function to get a React node with dynamically loaded icon
 * Useful for cases where you need the icon as a ReactNode (e.g., in menu items)
 * 
 * @param iconName - The name of the MUI icon
 * @param fallbackIcon - Optional fallback icon component
 * @returns ReactNode with the icon component
 * 
 * @example
 * const icon = getAppDynamicIcon("SettingsIcon");
 * <MenuItem icon={icon}>Settings</MenuItem>
 */
export const getAppDynamicIcon = (
  iconName: string | undefined,
  fallbackIcon?: React.ComponentType<any>
): React.ReactNode => {
  return <AppDynamicIcon iconName={iconName} fallbackIcon={fallbackIcon} />;
};

