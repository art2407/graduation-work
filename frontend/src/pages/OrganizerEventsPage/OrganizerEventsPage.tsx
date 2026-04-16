import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, List, ListItem, ListItemText, Chip, Stack,
  Button, Alert, Skeleton, Divider,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { eventsApi } from '../../shared/api/client';

const STATUS_LABELS: Record<string, { label: string; color: any }> = {
  DRAFT:      { label: 'Черновик',    color: 'default' },
  MODERATION: { label: 'На модерации', color: 'warning' },
  PUBLISHED:  { label: 'Опубликовано', color: 'success' },
  REJECTED:   { label: 'Отклонено',   color: 'error' },
  CANCELLED:  { label: 'Отменено',    color: 'default' },
  COMPLETED:  { label: 'Завершено',   color: 'info' },
};

export default function OrganizerEventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.getMyEvents().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-events'] }),
  });

  return (
    <Box maxWidth={900} mx="auto">
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
          У вас пока нет мероприятий.{' '}
          <strong>Создайте первое!</strong>
        </Alert>
      ) : (
        <Paper elevation={2}>
          <List disablePadding>
            {data.data.map((event: any, idx: number) => {
              const st = STATUS_LABELS[event.status] ?? { label: event.status, color: 'default' };
              return (
                <Box key={event.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{ py: 2 }}
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          Открыть
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => {
                            if (confirm('Удалить мероприятие?')) deleteMutation.mutate(event.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          Удалить
                        </Button>
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography fontWeight={600}>{event.title}</Typography>
                          <Chip label={st.label} color={st.color} size="small" />
                          {event.registeredCount > 0 && (
                            <Chip
                              label={`${event.registeredCount} участников`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                          {event.rejectionReason && (
                            <Box component="span" color="error.main" ml={1}>
                              • Причина отклонения: {event.rejectionReason}
                            </Box>
                          )}
                        </Typography>
                      }
                    />
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
    </Box>
  );
}
