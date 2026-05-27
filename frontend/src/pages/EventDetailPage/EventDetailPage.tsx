import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Alert, CircularProgress, Grid, Link,
  Skeleton, Dialog, DialogTitle, DialogContent, List, ListItem,
  ListItemText, Chip, Divider, LinearProgress,
} from '@mui/material';
import {
  CalendarToday, LocationOn, People, Email, Phone, Chat,
  ArrowBack, CheckCircle, QrCodeScanner, Edit, AccessTime,
  MeetingRoom,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { eventsApi, registrationApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic: 'Академическое', career: 'Карьерное', cultural: 'Культурное',
  sport: 'Спортивное', social: 'Социальное', volunteer: 'Волонтёрское',
  hackathon: 'Хакатон', other: 'Другое',
};

const COVER_GRADIENT: Record<string, string> = {
  academic:  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  hackathon: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  career:    'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
  cultural:  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  sport:     'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
  social:    'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
  volunteer: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  other:     'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
};

// ── Info row ─────────────────────────────────────────────────
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ mt: 0.25, color: 'primary.light', flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
          {label}
        </Typography>
        <Box sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

// ── Attendees Dialog ──────────────────────────────────────────
function AttendeesDialog({ eventId, open, onClose }: { eventId: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['attendees', eventId],
    queryFn: () => registrationApi.getAttendees(eventId).then((r) => r.data),
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Участники {data?.pagination?.total != null ? `(${data.pagination.total})` : ''}
      </DialogTitle>
      <DialogContent sx={{ px: 2 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : !data?.data?.length ? (
          <Alert severity="info" sx={{ borderRadius: '12px' }}>Нет зарегистрированных участников</Alert>
        ) : (
          <List disablePadding>
            {data.data.map((reg: any) => {
              const p = reg.user?.studentProfile;
              return (
                <ListItem key={reg.id} divider sx={{ px: 0, gap: 1 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                    bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'primary.main',
                  }}>
                    {(p?.fullName ?? reg.user?.login ?? '?')[0].toUpperCase()}
                  </Box>
                  <ListItemText
                    primary={p?.fullName ?? reg.user?.login ?? '—'}
                    secondary={[p?.group, p?.institute?.name].filter(Boolean).join(' • ')}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                  <Chip
                    label={reg.status === 'ATTENDED' ? '✓ Пришёл' : 'Зарег.'}
                    size="small"
                    sx={{
                      bgcolor: reg.status === 'ATTENDED' ? '#D1FAE5' : '#EEF2FF',
                      color: reg.status === 'ATTENDED' ? '#065F46' : '#4338CA',
                      fontWeight: 700, fontSize: '0.7rem',
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <Box>
      <Skeleton width={100} height={36} sx={{ mb: 2, borderRadius: '8px' }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '20px', mb: 3 }} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Skeleton width="60%" height={32} sx={{ mb: 1 }} />
          <Skeleton width="90%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '12px' }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: '16px' }} />
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [attendeesOpen, setAttendeesOpen] = useState(false);

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

  if (isLoading) return <DetailSkeleton />;
  if (error || !event) return <Alert severity="error" sx={{ borderRadius: '12px' }}>Мероприятие не найдено</Alert>;

  const now = new Date();
  const isPast       = new Date(event.startAt) < now;
  const isCompleted  = event.status === 'COMPLETED';
  const isCancelled  = event.status === 'CANCELLED';
  const isRegClosed  = isCompleted || isPast ||
    (!!event.registrationDeadline && new Date(event.registrationDeadline) < now);
  const isFull       = !!(event.capacity && event.registeredCount >= event.capacity);
  const canRegister  = isAuthenticated && user?.role === 'STUDENT'
    && event.status === 'PUBLISHED' && !isRegClosed && !isFull;
  const isOrganizer  = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const twoHrsBefore = new Date(new Date(event.startAt).getTime() - 2 * 60 * 60 * 1000);
  const canCancel    = event.isRegistered && !event.isCheckedIn && now < twoHrsBefore;
  const capacityPct  = event.capacity ? Math.min((event.registeredCount / event.capacity) * 100, 100) : 0;
  const gradient     = COVER_GRADIENT[event.type] ?? COVER_GRADIENT.other;

  return (
    <Box>
      {/* ── Назад ── */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 500 }}
      >
        Мероприятия
      </Button>

      {/* ── Hero-обложка ── */}
      <Box sx={{
        width: '100%', height: { xs: 200, sm: 300 },
        borderRadius: '20px', mb: 3, overflow: 'hidden', position: 'relative',
        background: event.imageUrl ? undefined : gradient,
        backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,.45) 100%)',
        }} />
        <Box sx={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 1 }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)',
            color: 'white', fontSize: '0.75rem', fontWeight: 700,
            px: 1.5, py: 0.5, borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)',
          }}>
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </Box>
          {(isCancelled || isCompleted) && (
            <Box sx={{
              bgcolor: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
              color: 'white', fontSize: '0.75rem', fontWeight: 700,
              px: 1.5, py: 0.5, borderRadius: '8px',
            }}>
              {isCancelled ? 'Отменено' : 'Завершено'}
            </Box>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ── Левая колонка ── */}
        <Grid item xs={12} md={8}>
          <Typography variant="h4" fontWeight={800} color="text.primary"
            sx={{ mb: 1, letterSpacing: '-0.5px', lineHeight: 1.25 }}>
            {event.title}
          </Typography>

          {event.organizer?.organizationName && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
              Организатор: <strong style={{ color: '#1E1B4B' }}>{event.organizer.organizationName}</strong>
            </Typography>
          )}

          <Divider sx={{ mb: 3, borderColor: 'divider' }} />

          {/* Описание */}
          <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, mb: 3 }}>
            {event.description || <span style={{ color: '#BCC1CF' }}>Описание не указано</span>}
          </Typography>

          {/* Контакты */}
          {(event.contactEmail || event.contactPhone || event.chatLink) && (
            <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#F8F7FF', border: '1px solid #E9E7F9', mb: 3 }}>
              <Typography variant="subtitle2" color="text.primary" sx={{ mb: 1.5 }}>Контакты</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {event.contactEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email sx={{ fontSize: 16, color: 'primary.light' }} />
                    <Link href={`mailto:${event.contactEmail}`} sx={{ fontSize: '0.875rem', color: 'primary.main' }}>
                      {event.contactEmail}
                    </Link>
                  </Box>
                )}
                {event.contactPhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone sx={{ fontSize: 16, color: 'primary.light' }} />
                    <Typography variant="body2">{event.contactPhone}</Typography>
                  </Box>
                )}
                {event.chatLink && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chat sx={{ fontSize: 16, color: 'primary.light' }} />
                    <Link href={event.chatLink} target="_blank" rel="noopener"
                      sx={{ fontSize: '0.875rem', color: 'primary.main' }}>
                      Чат мероприятия
                    </Link>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Кнопки организатора */}
          {isOrganizer && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<People />}
                onClick={() => setAttendeesOpen(true)} sx={{ borderRadius: '10px' }}>
                Участники ({event.registeredCount ?? 0})
              </Button>
              {event.status === 'PUBLISHED' && (
                <Button variant="contained" startIcon={<QrCodeScanner />}
                  onClick={() => navigate('/scan')} sx={{ borderRadius: '10px' }}>
                  Сканировать QR
                </Button>
              )}
              {user?.id === event.organizer?.id && (
                <Button variant="outlined" startIcon={<Edit />}
                  onClick={() => navigate(`/events/${id}/edit`)} sx={{ borderRadius: '10px' }}>
                  Редактировать
                </Button>
              )}
            </Box>
          )}
        </Grid>

        {/* ── Правая колонка — инфо-карточка ── */}
        <Grid item xs={12} md={4}>
          <Box sx={{
            position: { md: 'sticky' }, top: { md: 80 },
            bgcolor: 'background.paper', borderRadius: '20px',
            border: '1px solid #E9E7F9',
            boxShadow: '0 4px 12px rgba(30,27,75,.07)',
            overflow: 'hidden',
          }}>
            {/* Статус / регистрация */}
            <Box sx={{ p: 2.5, borderBottom: '1px solid #E9E7F9' }}>
              {event.isCheckedIn && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2, borderRadius: '10px' }}>
                  Вы отметились на мероприятии
                </Alert>
              )}
              {event.isRegistered && !event.isCheckedIn && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                  Вы зарегистрированы
                </Alert>
              )}

              {/* Кнопка регистрации / отмены */}
              {!isAuthenticated && !isRegClosed && (
                <Button fullWidth variant="contained" size="large"
                  onClick={() => navigate('/login')} sx={{ borderRadius: '12px', py: 1.5 }}>
                  Войдите для записи
                </Button>
              )}
              {canRegister && !event.isRegistered && (
                <Button fullWidth variant="contained" size="large"
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                  sx={{ borderRadius: '12px', py: 1.5 }}>
                  {registerMutation.isPending ? <CircularProgress size={22} color="inherit" /> : 'Зарегистрироваться'}
                </Button>
              )}
              {canCancel && (
                <Button fullWidth variant="outlined" color="error" size="large"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  sx={{ borderRadius: '12px', py: 1.5 }}>
                  {cancelMutation.isPending ? <CircularProgress size={22} /> : 'Отменить запись'}
                </Button>
              )}
              {event.isRegistered && !event.isCheckedIn && !canCancel && !isPast && (
                <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                  Отмена недоступна — менее 2 часов до начала
                </Alert>
              )}
              {isRegClosed && !event.isRegistered && user?.role === 'STUDENT' && (
                <Box sx={{ py: 1, px: 2, bgcolor: '#F3F4F6', borderRadius: '10px', textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {isCompleted ? 'Мероприятие завершено' : 'Регистрация закрыта'}
                  </Typography>
                </Box>
              )}
              {event.isRegistered && !event.isCheckedIn && event.status === 'PUBLISHED' && (
                <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }} icon={<CheckCircle />}>
                  QR-код для входа — в <strong>Профиле</strong>
                </Alert>
              )}
              {(registerMutation.isError || cancelMutation.isError) && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: '10px' }}>
                  {((registerMutation.error || cancelMutation.error) as any)?.response?.data?.message || 'Ошибка'}
                </Alert>
              )}
            </Box>

            {/* Детали */}
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <InfoRow icon={<CalendarToday fontSize="small" />} label="Дата и время">
                {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                {event.endAt && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}— {format(new Date(event.endAt), 'HH:mm')}
                  </Typography>
                )}
              </InfoRow>

              <InfoRow icon={<LocationOn fontSize="small" />} label="Адрес">
                {event.address}
                {event.room && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <MeetingRoom sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">ауд. {event.room}</Typography>
                  </Box>
                )}
              </InfoRow>

              {event.capacity != null && (
                <InfoRow icon={<People fontSize="small" />} label="Участники">
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <span>{event.registeredCount} из {event.capacity}</span>
                      {isFull && (
                        <Typography component="span" variant="caption"
                          sx={{ color: '#EF4444', fontWeight: 700 }}>Мест нет</Typography>
                      )}
                    </Box>
                    <LinearProgress variant="determinate" value={capacityPct}
                      sx={{
                        height: 5, borderRadius: 3,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: isFull ? '#EF4444' : capacityPct > 80 ? '#F59E0B' : '#4F46E5',
                        },
                      }}
                    />
                  </Box>
                </InfoRow>
              )}

              {event.registrationDeadline && (
                <InfoRow icon={<AccessTime fontSize="small" />} label="Дедлайн регистрации">
                  {format(new Date(event.registrationDeadline), 'd MMMM, HH:mm', { locale: ru })}
                </InfoRow>
              )}

              {event.institute && (
                <InfoRow icon={<People fontSize="small" />} label="Организация">
                  {event.institute.name}
                </InfoRow>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      <AttendeesDialog eventId={id!} open={attendeesOpen} onClose={() => setAttendeesOpen(false)} />
    </Box>
  );
}
