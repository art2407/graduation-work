import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, Grid, Paper, FormHelperText,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { eventsApi, referencesApi } from '../../shared/api/client';

const schema = z.object({
  title: z.string().min(3, 'Минимум 3 символа'),
  description: z.string().min(10, 'Минимум 10 символов'),
  type: z.string().min(1, 'Выберите тип'),
  startAt: z.string().min(1, 'Укажите дату'),
  endAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  address: z.string().min(3, 'Укажите адрес'),
  capacity: z.coerce.number().min(1).optional().or(z.literal('')),
  instituteId: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  chatLink: z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data: typesData } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => referencesApi.getEventTypes().then((r) => r.data.types),
  });

  const { data: institutesData } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {},
    });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload = {
        ...data,
        latitude: 55.751244,
        longitude: 37.618423,
        capacity: data.capacity || undefined,
        contactEmail: data.contactEmail || undefined,
        chatLink: data.chatLink || undefined,
        endAt: data.endAt || undefined,
        registrationDeadline: data.registrationDeadline || undefined,
        instituteId: data.instituteId || undefined,
      };
      const { data: res } = await eventsApi.create(payload);
      navigate(`/events/${res.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания мероприятия');
    }
  };

  return (
    <Box maxWidth={800} mx="auto">
      <Typography variant="h4" fontWeight={700} mb={3}>Создать мероприятие</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>
        После создания мероприятие будет отправлено на модерацию администратору
      </Alert>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField {...register('title')} label="Название" fullWidth
                error={!!errors.title} helperText={errors.title?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('description')} label="Описание" fullWidth multiline rows={4}
                error={!!errors.description} helperText={errors.description?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel>Тип мероприятия</InputLabel>
                <Controller name="type" control={control} defaultValue=""
                  render={({ field }) => (
                    <Select {...field} label="Тип мероприятия">
                      {typesData?.map((t: any) => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
                <FormHelperText>{errors.type?.message}</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Организация / Институт (опционально)</InputLabel>
                <Controller name="instituteId" control={control} defaultValue=""
                  render={({ field }) => (
                    <Select {...field} label="Организация / Институт (опционально)">
                      <MenuItem value="">— Для всех подразделений —</MenuItem>
                      {institutesData?.map((i: any) => (
                        <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField {...register('startAt')} label="Дата и время начала" type="datetime-local"
                fullWidth InputLabelProps={{ shrink: true }}
                error={!!errors.startAt} helperText={errors.startAt?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField {...register('endAt')} label="Дата и время окончания" type="datetime-local"
                fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField {...register('registrationDeadline')} label="Дедлайн регистрации"
                type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField {...register('capacity')} label="Лимит участников" type="number"
                fullWidth inputProps={{ min: 1 }} helperText="Оставьте пустым для неограниченного" />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('address')} label="Адрес проведения" fullWidth
                error={!!errors.address} helperText={errors.address?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('contactEmail')} label="Email для связи" type="email" fullWidth
                error={!!errors.contactEmail} helperText={errors.contactEmail?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('chatLink')} label="Ссылка на чат (TG/VK)" fullWidth
                placeholder="https://t.me/..." error={!!errors.chatLink} />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={24} /> : 'Создать мероприятие'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}
