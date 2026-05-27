import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, Link,
  CircularProgress, IconButton, InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, EventNote, ArrowForward } from '@mui/icons-material';
import { useState } from 'react';
import { authApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';

const schema = z.object({
  login:    z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError]         = useState('');
  const [showPassword, setShowPwd] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const { data: tokens } = await authApi.login(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(tokens.user);
      navigate(tokens.user.role === 'ADMIN' ? '/admin' : '/events');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Неверный логин или пароль');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Левая декоративная панель (только десктоп) ── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '45%',
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #4F46E5 0%, #7C3AED 60%, #A855F7 100%)',
        p: 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Декоративные круги */}
        <Box sx={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(255,255,255,.08)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'rgba(255,255,255,.06)',
        }} />

        {/* Контент */}
        <Box sx={{ position: 'relative', color: 'white', width: '100%', maxWidth: 340 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px',
            bgcolor: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3,
          }}>
            <EventNote sx={{ fontSize: 38, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight={800} mb={1.5} textAlign="center" sx={{ letterSpacing: '-0.5px' }}>
            СтудСобытия
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ opacity: 0.85, lineHeight: 1.6, mb: 2 }}>
            Платформа студенческих мероприятий МИРЭА. Находи события, регистрируйся и не пропускай ничего важного.
          </Typography>

          {/* Фиче-чипы */}
          {['🎓 Конференции и олимпиады', '🎭 Культурные события', '⚽ Спортивные мероприятия'].map((f) => (
            <Box key={f} sx={{
              mt: 1.5, py: 1, px: 2,
              bgcolor: 'rgba(255,255,255,.12)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center',
              fontSize: '0.875rem',
            }}>
              {f}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Правая панель с формой ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 3, sm: 6 },
      }}>
        {/* Мобильный логотип */}
        <Box sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center', gap: 1, mb: 4,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EventNote sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Typography variant="h6" fontWeight={800} color="text.primary">СтудСобытия</Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" fontWeight={800} color="text.primary" mb={0.75} sx={{ letterSpacing: '-0.5px' }}>
            Добро пожаловать
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            Войдите, чтобы получить доступ к мероприятиям
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>
                Логин или email
              </Typography>
              <TextField
                {...register('login')}
                placeholder="Введите логин"
                fullWidth
                error={!!errors.login}
                helperText={errors.login?.message}
                autoFocus
                autoComplete="username"
              />
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>
                Пароль
              </Typography>
              <TextField
                {...register('password')}
                placeholder="Введите пароль"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPwd((v) => !v)}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.disabled' }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowForward />}
              sx={{ mt: 1, py: 1.5 }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
            </Button>
          </Box>

          <Typography mt={3} textAlign="center" variant="body2" color="text.secondary">
            Нет аккаунта?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Зарегистрироваться
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
