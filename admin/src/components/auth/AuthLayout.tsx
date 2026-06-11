import { Box, Container, Typography, useTheme } from '@mui/material';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* LEFT SIDE - Image Section */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          height: { xs: '40vh', md: '100vh' },
          backgroundColor: theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}CC 0%, ${theme.palette.primary.dark}CC 100%)`,
          }}
        />
        
        {/* Content */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            color: 'white',
            px: 4,
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            Admin Panel
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.95,
              fontWeight: 300,
              maxWidth: 400,
              mx: 'auto',
              textShadow: '0 1px 5px rgba(0,0,0,0.2)',
            }}
          >
            Manage your business with our powerful admin dashboard
          </Typography>
          
          {/* Decorative Elements */}
          <Box
            sx={{
              mt: 4,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 0.4,
                      transform: 'scale(1)',
                    },
                    '50%': {
                      opacity: 0.9,
                      transform: 'scale(1.2)',
                    },
                  },
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Decorative Shapes */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
      </Box>

      {/* RIGHT SIDE - Form Section */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          minHeight: { xs: '60vh', md: '100vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          p: { xs: 3, sm: 4, md: 6 },
        }}
      >
        <Container maxWidth="sm" sx={{ width: '100%' }}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: theme.palette.text.primary,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

