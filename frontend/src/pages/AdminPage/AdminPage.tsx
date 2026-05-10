import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Paper, List, ListItem, ListItemText,
  Button, Chip, Stack, Alert, CircularProgress, TextField, Select,
  MenuItem, FormControl, InputLabel, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle, Cancel, People, EventNote, Analytics,
  PersonAdd, School,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminApi } from '../../shared/api/client';

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Панель администратора</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<EventNote />} iconPosition="start" label="Модерация" />
        <Tab icon={<People />} iconPosition="start" label="Пользователи" />
        <Tab icon={<Analytics />} iconPosition="start" label="Аналитика" />
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

const ROLE_LABELS: Record<string, { label: string; color: any }> = {
  STUDENT:   { label: 'Студент',             color: 'primary' },
  ORGANIZER: { label: 'Организатор',         color: 'secondary' },
  ADMIN:     { label: 'Администратор',       color: 'error' },
  DEAN:      { label: 'Администрация вуза',  color: 'warning' },
};

function CreateDeanDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ login: '', email: '', password: '', fullName: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.createDean(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Ошибка создания'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <School color="warning" />
          <span>Новый сотрудник вуза</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Сотрудник сможет войти через обычную форму входа (/login) и получит доступ к
            кабинету администрации вуза.
          </Alert>
          <TextField label="Логин" size="small" fullWidth value={form.login} onChange={set('login')} />
          <TextField label="Email" type="email" size="small" fullWidth value={form.email} onChange={set('email')} />
          <TextField label="Пароль" type="password" size="small" fullWidth value={form.password} onChange={set('password')}
            helperText="Минимум 8 символов" />
          <TextField label="ФИО (необязательно)" size="small" fullWidth value={form.fullName} onChange={set('fullName')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.login || !form.email || form.password.length < 8}
        >
          {mutation.isPending ? <CircularProgress size={20} /> : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createDeanOpen, setCreateDeanOpen] = useState(false);

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

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUser(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          placeholder="Поиск по логину или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Роль</InputLabel>
          <Select value={roleFilter} label="Роль" onChange={(e) => setRoleFilter(e.target.value)}>
            <MenuItem value="">Все роли</MenuItem>
            <MenuItem value="STUDENT">Студент</MenuItem>
            <MenuItem value="ORGANIZER">Организатор</MenuItem>
            <MenuItem value="DEAN">Администрация вуза</MenuItem>
            <MenuItem value="ADMIN">Администратор</MenuItem>
          </Select>
        </FormControl>
        <Tooltip title="Создать сотрудника вуза">
          <Button
            variant="contained"
            color="warning"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDeanOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Сотрудник вуза
          </Button>
        </Tooltip>
      </Stack>

      {isLoading ? <CircularProgress /> : (
        <Paper>
          <List disablePadding>
            {data?.data?.map((user: any) => {
              const name = user.studentProfile?.fullName
                ?? user.organizerProfile?.fullName
                ?? user.login;
              const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'default' };
              return (
                <ListItem key={user.id} divider alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={600}>{name}</Typography>
                        <Chip label={roleInfo.label} color={roleInfo.color} size="small" />
                        {user.status === 'BLOCKED' && (
                          <Chip label="Заблокирован" color="error" size="small" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        @{user.login} · {user.email}
                        {user.lastLoginAt && ` · Вход: ${format(new Date(user.lastLoginAt), 'd MMM yyyy', { locale: ru })}`}
                      </Typography>
                    }
                  />
                  <Stack direction="row" spacing={1} alignItems="center" ml={1}>
                    {/* Смена роли */}
                    {user.role !== 'ADMIN' && (
                      <FormControl size="small" sx={{ minWidth: 165 }}>
                        <Select
                          value={user.role}
                          onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value })}
                          disabled={roleMutation.isPending}
                        >
                          <MenuItem value="STUDENT">Студент</MenuItem>
                          <MenuItem value="ORGANIZER">Организатор</MenuItem>
                          <MenuItem value="DEAN">Администрация вуза</MenuItem>
                          <MenuItem value="ADMIN">Администратор</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      variant="outlined"
                      color={user.status === 'BLOCKED' ? 'success' : 'error'}
                      onClick={() => blockMutation.mutate({
                        id: user.id,
                        status: user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
                      })}
                      disabled={blockMutation.isPending}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {user.status === 'BLOCKED' ? 'Разблокировать' : 'Заблокировать'}
                    </Button>
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {createDeanOpen && <CreateDeanDialog onClose={() => setCreateDeanOpen(false)} />}
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
