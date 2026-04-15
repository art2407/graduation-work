import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Button, Stack, Divider, Alert, CircularProgress,
  Paper, Grid, Link, Skeleton,
} from '@mui/material';
import {
  CalendarToday, LocationOn, People, Email, Phone, Chat, ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { eventsApi, registrationApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getOne(id!).then((r) => r.data),
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () => registrationApi.register(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => registrationApi.cancel(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  if (isLoading) return (
    <Box>
      <Skeleton height={60} sx={{ mb: 2 }} />
      <Skeleton height={300} sx={{ mb: 2 }} />
      <Skeleton height={200} />
    </Box>
  );

  if (error || !event) return (
    <Alert severity="error">Мероприятие не найдено</Alert>
  );

  const isPast = new Date(event.startAt) < new Date();
  const isFull = event.capacity && event.registeredCount >= event.capacity;
  const canRegister = isAuthenticated && user?.role === 'STUDENT'
    && event.status === 'PUBLISHED' && !isPast && !isFull;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Назад
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {event.imageUrl && (
            <Box
              component="img"
              src={event.imageUrl}
              alt={event.title}
              sx={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 2, mb: 2 }}
            />
          )}

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
            <Chip label={event.type} color="primary" />
            {event.institute && <Chip label={event.institute.name} variant="outlined" />}
            <Chip
              label={event.status === 'PUBLISHED' ? 'Идёт запись' : event.status}
              color={event.status === 'PUBLISHED' ? 'success' : 'default'}
            />
          </Stack>

          <Typography variant="h4" fontWeight={700} gutterBottom>
            {event.title}
          </Typography>

          <Typography variant="body1" color="text.secondary" gutterBottom>
            Организатор: <strong>{event.organizer.organizationName}</strong>
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {event.description}
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 80 }}>
            {event.isCheckedIn && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                Вы отметились на мероприятии
              </Alert>
            )}
            {event.isRegistered && !event.isCheckedIn && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Вы зарегистрированы
              </Alert>
            )}

            <Stack spacing={1.5}>
              <Box display="flex" gap={1}>
                <CalendarToday color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Дата и время</Typography>
                  <Typography fontWeight={500}>
                    {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                  </Typography>
                  {event.endAt && (
                    <Typography variant="body2" color="text.secondary">
                      до {format(new Date(event.endAt), 'HH:mm')}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box display="flex" gap={1}>
                <LocationOn color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Адрес</Typography>
                  <Typography fontWeight={500}>{event.address}</Typography>
                </Box>
              </Box>

              {event.capacity && (
                <Box display="flex" gap={1}>
                  <People color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Участники</Typography>
                    <Typography fontWeight={500}>
                      {event.registeredCount} / {event.capacity}
                      {isFull && <Chip label="Мест нет" size="small" color="error" sx={{ ml: 1 }} />}
                    </Typography>
                  </Box>
                </Box>
              )}

              {event.registrationDeadline && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Дедлайн регистрации</Typography>
                  <Typography fontWeight={500}>
                    {format(new Date(event.registrationDeadline), 'd MMMM, HH:mm', { locale: ru })}
                  </Typography>
                </Box>
              )}

              <Divider />

              {event.contactEmail && (
                <Box display="flex" gap={1} alignItems="center">
                  <Email fontSize="small" color="action" />
                  <Link href={`mailto:${event.contactEmail}`}>{event.contactEmail}</Link>
                </Box>
              )}
              {event.contactPhone && (
                <Box display="flex" gap={1} alignItems="center">
                  <Phone fontSize="small" color="action" />
                  <Typography>{event.contactPhone}</Typography>
                </Box>
              )}
              {event.chatLink && (
                <Box display="flex" gap={1} alignItems="center">
                  <Chat fontSize="small" color="action" />
                  <Link href={event.chatLink} target="_blank" rel="noopener">
                    Чат мероприятия
                  </Link>
                </Box>
              )}
            </Stack>

            <Box mt={3}>
              {!isAuthenticated && (
                <Button fullWidth variant="contained" onClick={() => navigate('/login')}>
                  Войдите для записи
                </Button>
              )}

              {canRegister && !event.isRegistered && (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? <CircularProgress size={24} /> : 'Записаться'}
                </Button>
              )}

              {event.isRegistered && !event.isCheckedIn && !isPast && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <CircularProgress size={24} /> : 'Отменить запись'}
                </Button>
              )}

              {registerMutation.isError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {(registerMutation.error as any)?.response?.data?.message || 'Ошибка'}
                </Alert>
              )}
              {cancelMutation.isError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {(cancelMutation.error as any)?.response?.data?.message || 'Ошибка'}
                </Alert>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
