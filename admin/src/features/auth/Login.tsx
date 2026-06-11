import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuthStore } from '@/store/authStore';
import { AuthLayout } from '@/components/auth/AuthLayout';

const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

interface LoginFormData {
  email: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);

    try {
      await login(data.email, data.password);
      // Navigate to loading screen which will pre-fetch all data
      navigate('/loading', { replace: true });
    } catch (err: any) {
      // Extract error message from various possible API response formats
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        // Try different error message formats
        errorMessage = 
          errorData.message || 
          errorData.error || 
          errorData.errors?.message ||
          (Array.isArray(errorData.errors) ? errorData.errors.join(', ') : null) ||
          errorData.msg ||
          errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          {...register('email')}
          label="Email"
          type="email"
          fullWidth
          size="small"
          margin="normal"
          error={!!errors.email}
          helperText={errors.email?.message}
          autoComplete="email"
          sx={{ mb: 2 }}
        />

        <TextField
          {...register('password')}
          label="Password"
          type="password"
          fullWidth
          size="small"
          margin="normal"
          error={!!errors.password}
          helperText={errors.password?.message}
          autoComplete="current-password"
          sx={{ mb: 2 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="small"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>

        {/* Temporary disabled register link */}
        {/* <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 600,
              }}
            >
              Sign Up
            </Link>
          </Typography>
        </Box> */}
      </Box>
    </AuthLayout>
  );
};

