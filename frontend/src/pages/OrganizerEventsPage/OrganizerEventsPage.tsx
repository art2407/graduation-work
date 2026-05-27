import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Skeleton, Stack,
  Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add, Edit, Delete, Cancel, Download, Visibility, EventNote,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { eventsApi } from '../../shared/api/client';
import { useDownloadCsv } from '../../shared/hooks/useDownloadCsv';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:      { label: 'Черновик',     color: '#374151', bg: '#F3F4F6' },
  MODERATION: { label: 'На модерации', color: '#92400E', bg: '#FEF3C7' },
  PUBLISHED:  { label: 'Опубликовано', color: '#065F46', bg: '#D1FAE5' },
  REJECTED:   { label: 'Отклонено',   color: '#991B1B', bg: '#FEE2E2' },
  CANCELLED:  { label: 'Отменено',    color: '#374151', bg: '#F3F4F6' },
  COMPLETED:  { label: 'Завершено',   color: '#1E40AF', bg: '#DBEAFE' },
};

const canEdit = (status: string) =>
  ['DRAFT', 'MODERATION', 'REJECTED', 'PUBLISHED'].includes(status);

const canCancel = (status: string) =>
  ['MODERATION', 'PUBLISHED'].includes(status);

export default function OrganizerEventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ id: string; title: string } | null>(null);
  const [csvLoading, setCsvLoading] = useState<string | null>(null);
  const downloadCsv = useDownloadCsv();

  const { data, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.getMyEvents().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      setConfirmDelete(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => eventsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      setConfirmCancel(null);
    },
  });

  return (
    <Box maxWidth={960} mx="auto">

      {/* ── Шапка ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
            Мои мероприятия
          </Typography>
          {!isLoading && (
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              Всего: {data?.pagination?.total ?? data?.data?.length ?? 0}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Список ── */}
      {isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={84}
              sx={{ borderRadius: '14px' }} />
          ))}
        </Stack>
      ) : !data?.data?.length ? (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          py: 10, gap: 1.5,
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px',
            bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EventNote sx={{ fontSize: 36, color: 'primary.light' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Мероприятий ещё нет
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Создайте первое мероприятие, чтобы начать
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ mt: 1 }}
            onClick={() => navigate('/events/new')}
          >
            Создать мероприятие
          </Button>
        </Box>
      ) : (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: '16px',
          border: '1px solid', borderColor: 'divider', overflow: 'hidden',
        }}>
          {data.data.map((event: any, idx: number) => {
            const st = STATUS_CONFIG[event.status] ?? { label: event.status, color: '#374151', bg: '#F3F4F6' };
            const grad = COVER_GRADIENT[event.type] ?? COVER_GRADIENT.other;

            return (
              <Box key={event.id} sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2, p: 2.5,
                borderTop: idx > 0 ? '1px solid' : 'none',
                borderColor: 'divider',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                '&:hover': { bgcolor: 'rgba(79,70,229,.02)' },
                transition: 'background .15s',
              }}>

                {/* Иконка типа */}
                <Box sx={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  background: grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EventNote sx={{ color: 'white', fontSize: 20 }} />
                </Box>

                {/* Основной контент */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} color="text.primary" noWrap>
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                  </Typography>
                  {event.rejectionReason && (
                    <Typography variant="caption" color="error.main" display="block">
                      Причина отклонения: {event.rejectionReason}
                    </Typography>
                  )}
                </Box>

                {/* Статус + участники */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
                  mt: { xs: 0, sm: 0 },
                }}>
                  <Box sx={{
                    px: 1.5, py: 0.5, borderRadius: '20px',
                    fontSize: '0.75rem', fontWeight: 600,
                    color: st.color, bgcolor: st.bg, whiteSpace: 'nowrap',
                  }}>
                    {st.label}
                  </Box>
                  {event.registeredCount > 0 && (
                    <Box sx={{
                      px: 1.5, py: 0.5, borderRadius: '20px',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: '#1E40AF', bgcolor: '#DBEAFE', whiteSpace: 'nowrap',
                    }}>
                      👥 {event.registeredCount}
                    </Box>
                  )}
                </Box>

                {/* Кнопки действий */}
                <Stack direction="row" spacing={0.25} alignItems="center" flexShrink={0}
                  sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 0.5, sm: 0 } }}>

                  <Tooltip title="Просмотр">
                    <IconButton size="small" onClick={() => navigate(`/events/${event.id}`)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {canEdit(event.status) && (
                    <Tooltip title="Редактировать">
                      <IconButton size="small" color="primary"
                        onClick={() => navigate(`/events/${event.id}/edit`)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  {event.registeredCount > 0 && (
                    <Tooltip title="Скачать список участников (CSV)">
                      <IconButton
                        size="small"
                        sx={{ color: '#065F46' }}
                        disabled={csvLoading === event.id}
                        onClick={async () => {
                          setCsvLoading(event.id);
                          try {
                            await downloadCsv(
                              `/events/${event.id}/attendees/export`,
                              `participants-${event.id}.csv`,
                            );
                          } finally { setCsvLoading(null); }
                        }}
                      >
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  {canCancel(event.status) && (
                    <Tooltip title="Отменить мероприятие">
                      <IconButton size="small" color="warning"
                        onClick={() => setConfirmCancel({ id: event.id, title: event.title })}>
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Удалить навсегда">
                    <IconButton size="small" color="error"
                      onClick={() => setConfirmDelete({ id: event.id, title: event.title })}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Диалог отмены ── */}
      <Dialog
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Отменить мероприятие?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={2}>«{confirmCancel?.title}»</Typography>
          <Box sx={{
            p: 2, borderRadius: '12px',
            bgcolor: '#FFFBEB', border: '1px solid #FDE68A',
          }}>
            <Typography variant="body2" color="#92400E">
              Мероприятие получит статус «Отменено». Все зарегистрированные участники будут
              уведомлены. Действие необратимо.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmCancel(null)} variant="outlined" sx={{ flex: 1 }}>
            Назад
          </Button>
          <Button
            color="warning" variant="contained"
            onClick={() => cancelMutation.mutate(confirmCancel!.id)}
            disabled={cancelMutation.isPending}
            sx={{ flex: 1 }}
          >
            {cancelMutation.isPending ? 'Отмена...' : 'Отменить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Диалог удаления ── */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Удалить мероприятие?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={2}>«{confirmDelete?.title}»</Typography>
          <Box sx={{
            p: 2, borderRadius: '12px',
            bgcolor: '#FEF2F2', border: '1px solid #FECACA',
          }}>
            <Typography variant="body2" color="#991B1B">
              Мероприятие будет безвозвратно удалено вместе со всеми регистрациями.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)} variant="outlined" sx={{ flex: 1 }}>
            Назад
          </Button>
          <Button
            color="error" variant="contained"
            onClick={() => deleteMutation.mutate(confirmDelete!.id)}
            disabled={deleteMutation.isPending}
            sx={{ flex: 1 }}
          >
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
