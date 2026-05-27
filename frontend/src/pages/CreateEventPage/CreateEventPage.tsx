import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, Grid, FormHelperText,
} from '@mui/material';
import { Add, ArrowBack, InfoOutlined } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { eventsApi, referencesApi } from '../../shared/api/client';

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа'),
  description: z.string().min(10, 'Минимум 10 символов'),
  type: z.string().min(1, 'Выберите тип'),
  startAt: z.string().min(1, 'Укажите дату и время начала').refine(
    (v) => { const d = new Date(v); const maxYear = new Date().getFullYear() + 1; return !isNaN(d.getTime()) && d.getFullYear() <= maxYear; },
    { message: `Год не должен превышать ${new Date().getFullYear() + 1}` },
  ),
  endAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  address: z.string().min(3, 'Укажите адрес'),
  room: z.string().max(100).optional().or(z.literal('')),
  capacity: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int('Лимит должен быть целым числом').min(1, 'Минимум 1 участник').optional(),
  ),
  instituteId: z.string().optional(),
  contactEmail: z.string().email('Некорректный email').optional().or(z.literal('')),
  chatLink: z.string().url('Некорректная ссылка (пример: https://t.me/...)').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.endAt && data.startAt) {
    if (new Date(data.endAt) <= new Date(data.startAt)) {
      ctx.addIssue({ code: 'custom', message: 'Дата окончания должна быть позже даты начала', path: ['endAt'] });
    }
  }
  if (data.registrationDeadline && data.startAt) {
    if (new Date(data.registrationDeadline) >= new Date(data.startAt)) {
      ctx.addIssue({ code: 'custom', message: 'Дедлайн регистрации должен быть раньше даты начала', path: ['registrationDeadline'] });
    }
  }
});

type FormData = z.infer<typeof schema>;

// Конвертация значения datetime-local в ISO 8601 для бэкенда
const toIso = (val?: string) => {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

const EVENT_TYPES = [
  { value: 'academic',  label: 'Академическое' },
  { value: 'hackathon', label: 'Хакатон' },
  { value: 'career',    label: 'Карьерное' },
  { value: 'cultural',  label: 'Культурное' },
  { value: 'sport',     label: 'Спортивное' },
  { value: 'social',    label: 'Социальное' },
  { value: 'volunteer', label: 'Волонтёрское' },
  { value: 'other',     label: 'Другое' },
];

function FieldLabel({ children, required }: { children: any; required?: boolean }) {
  return (
    <Typography variant="caption" fontWeight={600} color="text.primary"
      sx={{ mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {children}
      {required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
    </Typography>
  );
}

function SectionCard({ title, children }: { title: string; children: any }) {
  return (
    <Box sx={{
      bgcolor: 'background.paper', borderRadius: '16px',
      border: '1px solid', borderColor: 'divider', p: 3, mb: 2,
    }}>
      <Typography variant="caption" fontWeight={700} color="primary.main"
        sx={{
          display: 'block', mb: 2.5, pb: 1,
          borderBottom: '1.5px solid', borderColor: '#C7D2FE',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
        {title}
      </Typography>
      <Grid container spacing={2.5}>
        {children}
      </Grid>
    </Box>
  );
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data: institutesData } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { type: '', instituteId: '' },
    });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload = {
        ...data,
        startAt: toIso(data.startAt)!,
        endAt: toIso(data.endAt),
        registrationDeadline: toIso(data.registrationDeadline),
        room: data.room || undefined,
        capacity: data.capacity || undefined,
        contactEmail: data.contactEmail || undefined,
        chatLink: data.chatLink || undefined,
        instituteId: data.instituteId || undefined,
      };
      const { data: res } = await eventsApi.create(payload);
      navigate(`/events/${res.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания мероприятия');
    }
  };

  return (
    <Box maxWidth={720} mx="auto">

      {/* ── Шапка ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box
          onClick={() => navigate(-1)}
          sx={{
            width: 36, height: 36, borderRadius: '10px',
            border: '1.5px solid', borderColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'text.secondary',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
            transition: 'all .15s',
          }}
        >
          <ArrowBack fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.3px' }}>
            Новое мероприятие
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Заполните все обязательные поля
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

      {/* ── Уведомление о модерации ── */}
      <Box sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start',
        p: 2, mb: 3, borderRadius: '12px',
        bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
      }}>
        <InfoOutlined sx={{ color: 'primary.main', fontSize: 20, mt: 0.15, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ color: '#3730A3' }}>
          После создания мероприятие будет отправлено на модерацию администратору
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>

        <SectionCard title="Основная информация">
          <Grid item xs={12}>
            <FieldLabel required>Название</FieldLabel>
            <TextField {...register('title')} placeholder="Введите название мероприятия" fullWidth
              error={!!errors.title} helperText={errors.title?.message} />
          </Grid>
          <Grid item xs={12}>
            <FieldLabel required>Описание</FieldLabel>
            <TextField {...register('description')} placeholder="Расскажите подробнее о мероприятии..." fullWidth
              multiline rows={4} error={!!errors.description} helperText={errors.description?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.type}>
              <InputLabel>Тип мероприятия *</InputLabel>
              <Controller name="type" control={control} defaultValue=""
                render={({ field }) => (
                  <Select {...field} label="Тип мероприятия *">
                    {EVENT_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.type?.message}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Организация / Институт</InputLabel>
              <Controller name="instituteId" control={control} defaultValue=""
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Организация / Институт"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxWidth: 'min(420px, calc(100vw - 32px))',
                          '& .MuiMenuItem-root': { whiteSpace: 'normal', lineHeight: 1.4 },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">— Для всех подразделений —</MenuItem>
                    {institutesData?.map((i: any) => (
                      <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Grid>
        </SectionCard>

        <SectionCard title="Дата и время">
          <Grid item xs={12} sm={6}>
            <FieldLabel required>Начало</FieldLabel>
            <TextField {...register('startAt')} type="datetime-local" fullWidth
              error={!!errors.startAt} helperText={errors.startAt?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FieldLabel>Окончание</FieldLabel>
            <TextField {...register('endAt')} type="datetime-local" fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FieldLabel>Дедлайн регистрации</FieldLabel>
            <TextField {...register('registrationDeadline')} type="datetime-local" fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FieldLabel>Лимит участников</FieldLabel>
            <TextField {...register('capacity')} type="number" fullWidth
              placeholder="Без ограничений"
              inputProps={{ min: 1 }}
              helperText="Оставьте пустым для неограниченного" />
          </Grid>
        </SectionCard>

        <SectionCard title="Место проведения">
          <Grid item xs={12} sm={8}>
            <FieldLabel required>Адрес</FieldLabel>
            <TextField {...register('address')} placeholder="Улица, дом, корпус..." fullWidth
              error={!!errors.address} helperText={errors.address?.message} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FieldLabel>Аудитория / зал</FieldLabel>
            <TextField {...register('room')} placeholder="ауд. 305" fullWidth />
          </Grid>
        </SectionCard>

        <SectionCard title="Контакты">
          <Grid item xs={12} sm={6}>
            <FieldLabel>Email для связи</FieldLabel>
            <TextField {...register('contactEmail')} type="email" placeholder="contact@example.com" fullWidth
              error={!!errors.contactEmail} helperText={errors.contactEmail?.message} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FieldLabel>Ссылка на чат (TG / VK)</FieldLabel>
            <TextField {...register('chatLink')} placeholder="https://t.me/..." fullWidth
              error={!!errors.chatLink} helperText={errors.chatLink?.message} />
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(-1)}
            sx={{ flex: 1 }}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={!isSubmitting && <Add />}
            sx={{ flex: 2, py: 1.5 }}
          >
            {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Создать мероприятие'}
          </Button>
        </Box>

      </Box>
    </Box>
  );
}
