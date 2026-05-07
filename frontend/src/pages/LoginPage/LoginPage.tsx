import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert, Link, CircularProgress,
} from '@mui/material';
import { useState } from 'react';
import { authApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';

const schema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const { data: tokens } = await authApi.login(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(tokens.user);

      if (tokens.user.role === 'ADMIN') navigate('/admin');
      else navigate('/events');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Неверный логин или пароль');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
          Вход в систему
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('login')}
            label="Логин или email"
            fullWidth
            margin="normal"
            error={!!errors.login}
            helperText={errors.login?.message}
            autoFocus
          />
          <TextField
            {...register('password')}
            label="Пароль"
            type="password"
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
          </Button>
        </Box>

        <Typography mt={2} textAlign="center" variant="body2">
          Нет аккаунта?{' '}
          <Link component={RouterLink} to="/register">
            Зарегистрироваться
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
