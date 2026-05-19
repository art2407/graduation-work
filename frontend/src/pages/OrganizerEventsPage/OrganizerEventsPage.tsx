import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, List, ListItem, ListItemText, Chip, Stack,
  Button, Alert, Skeleton, Divider, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Add, Edit, Delete, Cancel, Download, Visibility,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { eventsApi } from '../../shared/api/client';
import { useDownloadCsv } from '../../shared/hooks/useDownloadCsv';

const STATUS_LABELS: Record<string, { label: string; color: any }> = {
  DRAFT:      { label: 'Черновик',       color: 'default' },
  MODERATION: { label: 'На модерации',   color: 'warning' },
  PUBLISHED:  { label: 'Опубликовано',   color: 'success' },
  REJECTED:   { label: 'Отклонено',      color: 'error' },
  CANCELLED:  { label: 'Отменено',       color: 'default' },
  COMPLETED:  { label: 'Завершено',      color: 'info' },
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Мои мероприятия</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/events/new')}>
          Создать
        </Button>
      </Box>

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={80} variant="rectangular" sx={{ borderRadius: 2 }} />)}
        </Stack>
      ) : !data?.data?.length ? (
        <Alert severity="info">
          У вас пока нет мероприятий. <strong>Создайте первое!</strong>
        </Alert>
      ) : (
        <Paper elevation={2}>
          <List disablePadding>
            {data.data.map((event: any, idx: number) => {
              const st = STATUS_LABELS[event.status] ?? { label: event.status, color: 'default' };
              return (
                <Box key={event.id}>
                  {idx > 0 && <Divider />}
                  <ListItem sx={{ py: 2, pr: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={0.5}>
                          <Typography fontWeight={600}>{event.title}</Typography>
                          <Chip label={st.label} color={st.color} size="small" />
                          {event.registeredCount > 0 && (
                            <Chip label={`${event.registeredCount} участников`} size="small" variant="outlined" />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                          </Typography>
                          {event.rejectionReason && (
                            <Typography variant="body2" color="error.main">
                              · {event.rejectionReason}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />

                    {/* Кнопки действий */}
                    <Stack direction="row" spacing={0.5} ml={{ xs: 0, sm: 1 }}
                      flexShrink={0} flexWrap="wrap" sx={{ mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                      <Tooltip title="Просмотр">
                        <Button size="small" startIcon={<Visibility />}
                          onClick={() => navigate(`/events/${event.id}`)}>
                          Открыть
                        </Button>
                      </Tooltip>

                      {canEdit(event.status) && (
                        <Tooltip title="Редактировать">
                          <Button size="small" startIcon={<Edit />} color="primary"
                            onClick={() => navigate(`/events/${event.id}/edit`)}>
                            Изменить
                          </Button>
                        </Tooltip>
                      )}

                      {event.registeredCount > 0 && (
                        <Tooltip title="Скачать список участников (CSV)">
                          <Button size="small" startIcon={<Download />} color="success"
                            disabled={csvLoading === event.id}
                            onClick={async () => {
                              setCsvLoading(event.id);
                              try {
                                await downloadCsv(
                                  `/events/${event.id}/attendees/export`,
                                  `participants-${event.id}.csv`,
                                );
                              } finally { setCsvLoading(null); }
                            }}>
                            {csvLoading === event.id ? 'Загрузка...' : 'CSV'}
                          </Button>
                        </Tooltip>
                      )}

                      {canCancel(event.status) && (
                        <Tooltip title="Отменить мероприятие">
                          <Button size="small" color="warning" startIcon={<Cancel />}
                            onClick={() => setConfirmCancel({ id: event.id, title: event.title })}>
                            Отменить
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip title="Удалить навсегда">
                        <Button size="small" color="error" startIcon={<Delete />}
                          onClick={() => setConfirmDelete({ id: event.id, title: event.title })}>
                          Удалить
                        </Button>
                      </Tooltip>
                    </Stack>
                  </ListItem>
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      <Typography variant="body2" color="text.secondary" mt={2}>
        Всего: {data?.pagination?.total ?? 0} мероприятий
      </Typography>

      {/* Диалог подтверждения отмены */}
      <Dialog open={!!confirmCancel} onClose={() => setConfirmCancel(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Отменить мероприятие?</DialogTitle>
        <DialogContent>
          <Typography>«{confirmCancel?.title}»</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Мероприятие получит статус «Отменено». Все зарегистрированные участники будут уведомлены.
            Действие необратимо.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(null)}>Назад</Button>
          <Button color="warning" variant="contained"
            onClick={() => cancelMutation.mutate(confirmCancel!.id)}
            disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Отмена...' : 'Отменить мероприятие'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить мероприятие?</DialogTitle>
        <DialogContent>
          <Typography>«{confirmDelete?.title}»</Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            Мероприятие будет безвозвратно удалено вместе со всеми регистрациями.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Назад</Button>
          <Button color="error" variant="contained"
            onClick={() => deleteMutation.mutate(confirmDelete!.id)}
            disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
