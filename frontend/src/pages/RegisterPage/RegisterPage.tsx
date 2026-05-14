import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert, Link, CircularProgress,
  ToggleButton, ToggleButtonGroup, MenuItem, Select, FormControl, InputLabel,
  LinearProgress,
} from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import {
  passwordSchema, getPasswordStrength,
  STRENGTH_LABELS, STRENGTH_COLORS,
} from '../../shared/utils/passwordValidation';

const schema = z.object({
  login: z.string().min(3, 'Минимум 3 символа'),
  email: z.string().email('Некорректный email'),
  password: passwordSchema,
  role: z.enum(['STUDENT', 'ORGANIZER']),
  fullName: z.string().min(2, 'Введите ФИО'),
  organizationName: z.string().optional(),
  instituteId: z.string().optional(),
  group: z.string().optional(),
  yearOfStudy: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().min(1).max(6).optional()
  ),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'ORGANIZER'>('STUDENT');
  const [pwdValue, setPwdValue] = useState('');
  const pwdStrength = pwdValue ? getPasswordStrength(pwdValue) : null;


  const { data: institutesData } = useQuery({
    queryKey: ['institutes', 'academic'],
    queryFn: () => referencesApi.getAcademicInstitutes().then((r) => r.data.institutes),
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { role: 'STUDENT' },
    });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = {
        login: data.login,
        email: data.email,
        password: data.password,
        role: data.role,
      };

      if (data.role === 'STUDENT') {
        payload.studentProfile = {
          fullName: data.fullName,
          instituteId: data.instituteId || undefined,
          group: data.group || undefined,
          yearOfStudy: data.yearOfStudy || undefined,
        };
      } else {
        payload.organizerProfile = {
          fullName: data.fullName,
          organizationName: data.organizationName || data.fullName,
        };
      }

      await authApi.register(payload);
      const { data: tokens } = await authApi.login({ login: data.login, password: data.password });
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(tokens.user);
      navigate('/events');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
          Регистрация
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={field.value}
                onChange={(_, val) => {
                  if (val) { field.onChange(val); setRole(val); }
                }}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="STUDENT">Студент</ToggleButton>
                <ToggleButton value="ORGANIZER">Организатор</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <TextField
            {...register('login')}
            label="Логин"
            fullWidth
            margin="dense"
            error={!!errors.login}
            helperText={errors.login?.message}
          />
          <TextField
            {...register('email')}
            label="Email"
            type="email"
            fullWidth
            margin="dense"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            {...register('password')}
            label="Пароль"
            type="password"
            fullWidth
            margin="dense"
            error={!!errors.password}
            helperText={errors.password?.message ?? 'Мин. 8 символов, буква и цифра'}
            onChange={(e) => setPwdValue(e.target.value)}
          />
          {pwdStrength && (
            <Box mt={-1} mb={1}>
              <LinearProgress
                variant="determinate"
                value={pwdStrength === 'weak' ? 33 : pwdStrength === 'medium' ? 66 : 100}
                color={STRENGTH_COLORS[pwdStrength]}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color={`${STRENGTH_COLORS[pwdStrength]}.main`}>
                Надёжность: {STRENGTH_LABELS[pwdStrength]}
              </Typography>
            </Box>
          )}
          <TextField
            {...register('fullName')}
            label="ФИО"
            fullWidth
            margin="dense"
            error={!!errors.fullName}
            helperText={errors.fullName?.message}
          />

          {role === 'STUDENT' && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel>Институт</InputLabel>
                <Controller
                  name="instituteId"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Институт">
                      <MenuItem value="">— Не выбран —</MenuItem>
                      {institutesData?.map((inst: any) => (
                        <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <TextField
                {...register('group')}
                label="Учебная группа"
                fullWidth
                margin="dense"
                placeholder="ИТ-21"
              />
              <TextField
                {...register('yearOfStudy')}
                label="Курс (1-6)"
                type="number"
                fullWidth
                margin="dense"
                inputProps={{ min: 1, max: 6 }}
              />
            </>
          )}

          {role === 'ORGANIZER' && (
            <TextField
              {...register('organizationName')}
              label="Название организации / объединения"
              fullWidth
              margin="dense"
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Зарегистрироваться'}
          </Button>
        </Box>

        <Typography mt={2} textAlign="center" variant="body2">
          Уже есть аккаунт?{' '}
          <Link component={RouterLink} to="/login">Войти</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
