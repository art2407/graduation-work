import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Paper, List, ListItem, ListItemText,
  Button, Chip, Stack, Alert, CircularProgress, TextField, Select,
  MenuItem, FormControl, InputLabel, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { CheckCircle, Cancel, People, EventNote, Analytics } from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminApi } from '../../shared/api/client';

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Панель администратора</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<EventNote />} label="Модерация" />
        <Tab icon={<People />} label="Пользователи" />
        <Tab icon={<Analytics />} label="Аналитика" />
      </Tabs>
      {tab === 0 && <ModerationTab />}
      {tab === 1 && <UsersTab />}
      {tab === 2 && <AnalyticsTab />}
    </Box>
  );
}

function ModerationTab() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{ id: string; title: string } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['moderation'],
    queryFn: () => adminApi.getModerationQueue().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.moderateEvent(id, 'approve'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.moderateEvent(id, 'reject', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      setRejectDialog(null);
      setReason('');
    },
  });

  if (isLoading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" mb={2}>
        На проверке: {data?.pagination?.total ?? 0} мероприятий
      </Typography>

      {!data?.data?.length ? (
        <Alert severity="success">Очередь модерации пуста</Alert>
      ) : (
        <Paper>
          <List>
            {data.data.map((event: any) => (
              <ListItem key={event.id} divider>
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{event.organizer.organizationName}</span>
                      <span>•</span>
                      <span>{format(new Date(event.createdAt), 'd MMMM yyyy', { locale: ru })}</span>
                    </Stack>
                  }
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => approveMutation.mutate(event.id)}
                    disabled={approveMutation.isPending}
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => setRejectDialog({ id: event.id, title: event.title })}
                  >
                    Отклонить
                  </Button>
                </Stack>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)}>
        <DialogTitle>Отклонить мероприятие</DialogTitle>
        <DialogContent>
          <Typography mb={2}>{rejectDialog?.title}</Typography>
          <TextField
            label="Причина отклонения"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => rejectMutation.mutate({ id: rejectDialog!.id, reason })}
            disabled={rejectMutation.isPending}
          >
            Отклонить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => adminApi.getUsers({ search: search || undefined, role: roleFilter || undefined })
      .then((r) => r.data),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateUser(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Роль</InputLabel>
          <Select value={roleFilter} label="Роль" onChange={(e) => setRoleFilter(e.target.value)}>
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="STUDENT">Студент</MenuItem>
            <MenuItem value="ORGANIZER">Организатор</MenuItem>
            <MenuItem value="ADMIN">Администратор</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? <CircularProgress /> : (
        <Paper>
          <List>
            {data?.data?.map((user: any) => (
              <ListItem key={user.id} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{user.studentProfile?.fullName ?? user.organizerProfile?.fullName ?? user.login}</span>
                      <Chip label={user.role} size="small" />
                      {user.status === 'BLOCKED' && <Chip label="Заблокирован" color="error" size="small" />}
                    </Stack>
                  }
                  secondary={`@${user.login} • ${user.email}`}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color={user.status === 'BLOCKED' ? 'success' : 'error'}
                  onClick={() => blockMutation.mutate({
                    id: user.id,
                    status: user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
                  })}
                >
                  {user.status === 'BLOCKED' ? 'Разблокировать' : 'Заблокировать'}
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

function AnalyticsTab() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => adminApi.getAnalytics({ period }).then((r) => r.data),
  });

  return (
    <Box>
      <FormControl size="small" sx={{ mb: 3, minWidth: 150 }}>
        <InputLabel>Период</InputLabel>
        <Select value={period} label="Период" onChange={(e) => setPeriod(e.target.value as any)}>
          <MenuItem value="day">День</MenuItem>
          <MenuItem value="week">Неделя</MenuItem>
          <MenuItem value="month">Месяц</MenuItem>
          <MenuItem value="year">Год</MenuItem>
        </Select>
      </FormControl>

      {isLoading ? <CircularProgress /> : (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h3" fontWeight={700} color="primary">{data?.eventsTotal}</Typography>
                <Typography color="text.secondary">Мероприятий создано</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h3" fontWeight={700} color="secondary">{data?.activeUsers}</Typography>
                <Typography color="text.secondary">Активных пользователей</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h3" fontWeight={700} color="success.main">{data?.registrations}</Typography>
                <Typography color="text.secondary">Регистраций на мероприятия</Typography>
              </CardContent>
            </Card>
          </Grid>

          {data?.topEvents?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" mb={1}>Топ мероприятий</Typography>
              <Paper>
                <List>
                  {data.topEvents.map((e: any, idx: number) => (
                    <ListItem key={e.eventId} divider>
                      <ListItemText
                        primary={`${idx + 1}. ${e.name}`}
                        secondary={`${e.attendees} участников`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
