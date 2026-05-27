import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, Link, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, LinearProgress,
  IconButton, InputAdornment,
} from '@mui/material';
import {
  School, BusinessCenter, ArrowForward, ArrowBack,
  EventNote, Visibility, VisibilityOff, CheckCircle,
} from '@mui/icons-material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import {
  passwordSchema, getPasswordStrength,
  STRENGTH_LABELS, STRENGTH_COLORS,
} from '../../shared/utils/passwordValidation';

const schema = z.object({
  login:    z.string().min(3, 'Минимум 3 символа'),
  email:    z.string().email('Некорректный email'),
  password: passwordSchema,
  role:     z.enum(['STUDENT', 'ORGANIZER']),
  fullName: z.string().min(2, 'Введите ФИО'),
  organizationName: z.string().optional(),
  instituteId:      z.string().optional(),
  group: z.string().optional().refine(
    (val) => !val || !val.trim() || /^[А-ЯЁ]{2,4}-\d{2}-\d{2}$/.test(val.trim().toUpperCase()),
    { message: 'Формат группы: ЭЛБО-02-18' },
  ),
  yearOfStudy: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().min(1).max(6).optional(),
  ),
});
type FormData = z.infer<typeof schema>;

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box key={i} sx={{
          height: 4,
          flex: 1,
          borderRadius: 2,
          bgcolor: i < step ? 'primary.main' : i === step ? 'primary.light' : 'divider',
          transition: 'background .3s',
        }} />
      ))}
    </Box>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError]           = useState('');
  const [step, setStep]             = useState(0);           // 0 / 1 / 2
  const [role, setRole]             = useState<'STUDENT' | 'ORGANIZER'>('STUDENT');
  const [pwdValue, setPwdValue]     = useState('');
  const [showPassword, setShowPwd]  = useState(false);
  const pwdStrength = pwdValue ? getPasswordStrength(pwdValue) : null;

  const { data: institutesData } = useQuery({
    queryKey: ['institutes', 'academic'],
    queryFn: () => referencesApi.getAcademicInstitutes().then((r) => r.data.institutes),
  });

  const { register, handleSubmit, control, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { role: 'STUDENT' },
    });

  // Проверяем поля текущего шага и переходим к следующему
  const goNext = async () => {
    // Шаг 0 — выбор роли, всегда валиден (есть дефолтное значение)
    if (step === 0) { setStep(1); return; }
    const fields: (keyof FormData)[] =
      step === 1 ? ['login', 'email', 'password'] : ['fullName'];
    const ok = await trigger(fields);
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = {
        login: data.login, email: data.email,
        password: data.password, role: data.role,
      };
      if (data.role === 'STUDENT') {
        payload.studentProfile = {
          fullName:    data.fullName,
          instituteId: data.instituteId || undefined,
          group:       data.group        || undefined,
          yearOfStudy: data.yearOfStudy  || undefined,
        };
      } else {
        payload.organizerProfile = {
          fullName:         data.fullName,
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
      setStep(1); // вернуться на шаг с аккаунтом
    }
  };

  return (
    <Box sx={{
      display: 'flex', minHeight: '100vh',
      bgcolor: 'background.default',
      alignItems: 'center', justifyContent: 'center',
      py: 4, px: 3,
    }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>

        {/* Логотип */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px', bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EventNote sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Typography variant="h6" fontWeight={800} color="text.primary">СтудСобытия</Typography>
        </Box>

        <Typography variant="h4" fontWeight={800} color="text.primary" mb={0.5} sx={{ letterSpacing: '-0.5px' }}>
          {step === 0 ? 'Кто вы?' : step === 1 ? 'Создайте аккаунт' : 'Расскажите о себе'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {step === 0 ? 'Шаг 1 из 3 — выберите роль' :
           step === 1 ? 'Шаг 2 из 3 — данные для входа' :
                        'Шаг 3 из 3 — личный профиль'}
        </Typography>

        <StepDots step={step} total={3} />

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* ── ШАГ 1: Аккаунт ── */}
          {step === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Логин</Typography>
                <TextField {...register('login')} placeholder="Придумайте логин" fullWidth
                  error={!!errors.login} helperText={errors.login?.message} autoFocus />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Email</Typography>
                <TextField {...register('email')} placeholder="your@email.com" type="email" fullWidth
                  error={!!errors.email} helperText={errors.email?.message} />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Пароль</Typography>
                <TextField
                  {...register('password')}
                  placeholder="Минимум 8 символов"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message ?? 'Буква + цифра, мин. 8 символов'}
                  onChange={(e) => setPwdValue(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPwd((v) => !v)} edge="end" size="small" sx={{ color: 'text.disabled' }}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {pwdStrength && (
                  <Box mt={1}>
                    <LinearProgress
                      variant="determinate"
                      value={pwdStrength === 'weak' ? 33 : pwdStrength === 'medium' ? 66 : 100}
                      color={STRENGTH_COLORS[pwdStrength]}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color={`${STRENGTH_COLORS[pwdStrength]}.main`} sx={{ fontWeight: 600 }}>
                      Надёжность: {STRENGTH_LABELS[pwdStrength]}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* ── ШАГ 2: Профиль ── */}
          {step === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>ФИО</Typography>
                <TextField {...register('fullName')} placeholder="Иван Иванов" fullWidth
                  error={!!errors.fullName} helperText={errors.fullName?.message} autoFocus />
              </Box>

              {role === 'STUDENT' && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Институт</InputLabel>
                    <Controller
                      name="instituteId"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} label="Институт" value={field.value ?? ''}>
                          <MenuItem value="">— Не выбран —</MenuItem>
                          {institutesData?.map((inst: any) => (
                            <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Учебная группа</Typography>
                    <TextField {...register('group')} placeholder="ИКБО-04-24" fullWidth
                      error={!!errors.group} helperText={errors.group?.message ?? 'Пример: ИКБО-04-24'}
                      inputProps={{ style: { textTransform: 'uppercase' } }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Курс</Typography>
                    <TextField {...register('yearOfStudy')} type="number" placeholder="1 – 6" fullWidth
                      inputProps={{ min: 1, max: 6 }} />
                  </Box>
                </>
              )}

              {role === 'ORGANIZER' && (
                <Box>
                  <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: 'block' }}>Название организации</Typography>
                  <TextField {...register('organizationName')} placeholder="Студенческий совет МИРЭА" fullWidth />
                </Box>
              )}
            </Box>
          )}

          {/* ── ШАГ 0: Роль ── */}
          {step === 0 && (
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    {
                      value: 'STUDENT',
                      icon: <School sx={{ fontSize: 28, color: '#4338CA' }} />,
                      title: 'Студент',
                      desc: 'Просматривайте мероприятия, регистрируйтесь и получайте QR-код для отметки посещаемости',
                      bg: '#EEF2FF',
                      border: '#818CF8',
                    },
                    {
                      value: 'ORGANIZER',
                      icon: <BusinessCenter sx={{ fontSize: 28, color: '#C2410C' }} />,
                      title: 'Организатор',
                      desc: 'Создавайте мероприятия, управляйте участниками и отмечайте посещаемость через QR-сканер',
                      bg: '#FFF7ED',
                      border: '#FDBA74',
                    },
                  ].map((opt) => {
                    const active = field.value === opt.value;
                    return (
                      <Box
                        key={opt.value}
                        onClick={() => { field.onChange(opt.value); setRole(opt.value as any); }}
                        sx={{
                          p: 2.5, borderRadius: '16px', cursor: 'pointer',
                          border: '2px solid',
                          borderColor: active ? opt.border : 'divider',
                          bgcolor: active ? opt.bg : 'background.paper',
                          display: 'flex', gap: 2, alignItems: 'flex-start',
                          transition: 'all .15s ease',
                          '&:hover': { borderColor: opt.border },
                          position: 'relative',
                        }}
                      >
                        <Box sx={{
                          width: 48, height: 48, borderRadius: '12px',
                          bgcolor: active ? opt.bg : '#F8F7FF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {opt.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" color="text.primary">{opt.title}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                            {opt.desc}
                          </Typography>
                        </Box>
                        {active && (
                          <CheckCircle sx={{
                            position: 'absolute', top: 12, right: 12,
                            color: 'primary.main', fontSize: 20,
                          }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            />
          )}

          {/* ── Кнопки навигации ── */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            {step > 0 && (
              <Button
                variant="outlined"
                onClick={() => setStep((s) => s - 1)}
                startIcon={<ArrowBack />}
                sx={{ flex: 1 }}
              >
                Назад
              </Button>
            )}

            {step < 2 ? (
              <Button
                variant="contained"
                onClick={goNext}
                endIcon={<ArrowForward />}
                sx={{ flex: step === 0 ? 1 : 1, py: 1.5 }}
              >
                Далее
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                endIcon={!isSubmitting && <ArrowForward />}
                sx={{ flex: 1, py: 1.5 }}
              >
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Создать аккаунт'}
              </Button>
            )}
          </Box>
        </Box>

        <Typography mt={3} textAlign="center" variant="body2" color="text.secondary">
          Уже есть аккаунт?{' '}
          <Link
            component={RouterLink}
            to="/login"
            sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Войти
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
