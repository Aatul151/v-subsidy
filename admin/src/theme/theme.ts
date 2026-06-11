import { createTheme, Theme, alpha } from '@mui/material/styles';
import { ThemeSettings } from '@/api/settings';
import './theme.d';
import { grey } from '@mui/material/colors';

export const createAppTheme = (settings: ThemeSettings): Theme => {

  const inputHeight = 40;
  return createTheme({
    palette: {
      mode: settings.mode,
      primary: {
        main: settings.primaryColor,
      },
      secondary: {
        main: settings.secondaryColor,
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      pageTitle: {
        fontSize: '1.1rem',
        color: settings.primaryColor,
        textTransform: 'capitalize',
      },
      groupSectionTitle: {
        fontSize: '1rem',
        textTransform: 'capitalize',
      },
      fieldLabel: {
        fontSize: '0.75rem',
        color: grey[500],
        letterSpacing: '0.5px',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 5,
            padding: '5px 10px',
            fontSize: '0.875rem',
          },
          sizeSmall: {
            padding: '5px 10px',
            minWidth: 'auto',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            '&.MuiAccordion-root': {
              borderRadius: 0,
            },
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: '0 !important',
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 0,
            borderBottom: "none",
            minHeight: inputHeight,
            '&.Mui-expanded': {
              borderRadius: 0,
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.2),
              minHeight: inputHeight,
            },
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }),
          content: {
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '15px',
          },
        },
      },
      // this is for text field, select field, checkbox field, radio field, datepicker field, toggle field, color field
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 5,
              fontSize: '0.875rem',
            },
            '& .MuiFilledInput-root': {
              borderRadius: 5,
              fontSize: '0.875rem',
            },
          },
        },
      },
      // this is for select field, checkbox field, radio field, datepicker field, toggle field, color field, file field
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 5,
            fontSize: '0.875rem',
            minHeight: inputHeight,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'light'
                ? theme.palette.grey[300]
                : theme.palette.grey[700],
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'light'
                ? theme.palette.grey[400]
                : theme.palette.grey[600],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
            '& .MuiInputBase-input': {
              padding: '6px 10px',
              height: 'auto',
            },
            '&.MuiInputBase-sizeSmall': {
              minHeight: '32px',
              '& .MuiInputBase-input': {
                padding: '4px 10px',
                height: 'auto',
              },
            },
          }),
        },
      },
      // this is for filled input field
      MuiFilledInput: {
        styleOverrides: {
          root: {
            borderRadius: 5,
            fontSize: '0.875rem',
            minHeight: inputHeight,
            '& .MuiInputBase-input': {
              padding: '6px 10px',
              height: 'auto',
            },
            '&.MuiInputBase-sizeSmall': {
              minHeight: '32px',
              '& .MuiInputBase-input': {
                padding: '4px 10px',
                height: 'auto',
              },
            },
          },
        },
      },
      // this is for text field, select field, checkbox field, radio field, datepicker field, toggle field, color field, file field
      // this is for input base field
      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.MuiOutlinedInput-root': {
              borderRadius: 5,
              fontSize: '0.875rem',
              minHeight: inputHeight,
            },
            '&.MuiFilledInput-root': {
              borderRadius: 5,
              fontSize: '0.875rem',
              minHeight: inputHeight,
            },
            '& .MuiInputBase-input': {
              padding: '6px 10px',
              height: 'auto',
            },
            '&.MuiInputBase-sizeSmall': {
              minHeight: inputHeight,
              '&.MuiOutlinedInput-root': {
                minHeight: inputHeight,
              },
              '&.MuiFilledInput-root': {
                minHeight: inputHeight,
              },
              '& .MuiInputBase-input': {
                padding: '4px 10px',
                height: 'auto',
              },
            },
          },
        },
      },
      // Input label styling to reduce height
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '&.MuiInputLabel-sizeSmall': {
              fontSize: '0.8125rem',
            },
          },
        },
      },
      // Form label styling
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '&.MuiInputLabel-sizeSmall': {
              fontSize: '0.8125rem',
            },
          },
        },
      },
    },
  });
};

