import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    pageTitle: React.CSSProperties;
    groupSectionTitle: React.CSSProperties;
    fieldLabel: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    pageTitle?: React.CSSProperties;  
    groupSectionTitle?: React.CSSProperties;
    fieldLabel?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    pageTitle: true;
    groupSectionTitle: true;
    fieldLabel: true;
  }
}

export {};

