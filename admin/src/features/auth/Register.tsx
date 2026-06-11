import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuthStore } from '@/store/authStore';
import { AuthLayout } from '@/components/auth/AuthLayout';

const registerSchema = yup.object({
  name: yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setLoading(true);
    try {
      await registerUser(data.name, data.email, data.password);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Sign up to get started with your admin panel"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          {...register('name')}
          label="Full Name"
          fullWidth
          size="small"
          margin="normal"
          error={!!errors.name}
          helperText={errors.name?.message}
          autoComplete="name"
          sx={{ mb: 2 }}
        />

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
          autoComplete="new-password"
          sx={{ mb: 2 }}
        />

        <TextField
          {...register('confirmPassword')}
          label="Confirm Password"
          type="password"
          fullWidth
          size="small"
          margin="normal"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          autoComplete="new-password"
          sx={{ mb: 2 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="small"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign Up'}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

