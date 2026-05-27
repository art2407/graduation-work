import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Button, Alert, CircularProgress,
  TextField, Select, MenuItem, FormControl, InputLabel, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  IconButton, Tooltip, Divider,
} from '@mui/material';
import {
  CheckCircle, Cancel, People, EventNote, BarChart,
  PersonAdd, School, Block, LockOpen, Delete,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { adminApi } from '../../shared/api/client';

// ── Утилиты ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STUDENT:   { label: 'Студент',           color: '#4338CA', bg: '#EEF2FF' },
  ORGANIZER: { label: 'Организатор',       color: '#C2410C', bg: '#FFF7ED' },
  ADMIN:     { label: 'Администратор',     color: '#991B1B', bg: '#FEE2E2' },
  DEAN:      { label: 'Адм. вуза',        color: '#92400E', bg: '#FEF3C7' },
};

const ROLE_AVATAR_COLOR: Record<string, string> = {
  STUDENT:   '#4338CA',
  ORGANIZER: '#C2410C',
  ADMIN:     '#991B1B',
  DEAN:      '#92400E',
};

const STAT_CARD_COLORS = [
  { bg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', text: 'white' },
  { bg: 'linear-gradient(135deg, #F97316 0%, #EC4899 100%)', text: 'white' },
  { bg: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)', text: 'white' },
];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, color: '#374151', bg: '#F3F4F6' };
  return (
    <Box sx={{
      px: 1.5, py: 0.4, borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 600,
      color: cfg.color, bgcolor: cfg.bg, whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {cfg.label}
    </Box>
  );
}

function AvatarCircle({ name, role }: { name: string; role: string }) {
  const color = ROLE_AVATAR_COLOR[role] ?? '#4338CA';
  return (
    <Box sx={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      bgcolor: `${color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '1rem', color,
    }}>
      {name.charAt(0).toUpperCase()}
    </Box>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
          Панель администратора
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.25}>
          Управление мероприятиями и пользователями
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3, minHeight: 0,
          '& .MuiTabs-flexContainer': { gap: 0.5 },
          '& .MuiTab-root': {
            borderRadius: '10px', fontWeight: 600,
            minHeight: 40, py: 1, px: 2,
            textTransform: 'none', color: 'text.secondary',
            '&.Mui-selected': { bgcolor: 'primary.main', color: 'white' },
          },
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        <Tab icon={<EventNote fontSize="small" />} iconPosition="start" label="Модерация" />
        <Tab icon={<People fontSize="small" />} iconPosition="start" label="Пользователи" />
        <Tab icon={<BarChart fontSize="small" />} iconPosition="start" label="Аналитика" />
      </Tabs>

      {tab === 0 && <ModerationTab />}
      {tab === 1 && <UsersTab />}
      {tab === 2 && <AnalyticsTab />}
    </Box>
  );
}

// ── Вкладка: Модерация ────────────────────────────────────────────────────────

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

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>На проверке</Typography>
        {(data?.pagination?.total ?? 0) > 0 && (
          <Box sx={{
            px: 1.5, py: 0.3, borderRadius: '20px', fontWeight: 700,
            fontSize: '0.8rem', bgcolor: '#FEF3C7', color: '#92400E',
          }}>
            {data.pagination.total}
          </Box>
        )}
      </Box>

      {!data?.data?.length ? (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          py: 8, gap: 1.5,
        }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '18px',
            bgcolor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle sx={{ fontSize: 32, color: '#065F46' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">Очередь пуста</Typography>
          <Typography variant="body2" color="text.secondary">
            Все мероприятия проверены
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {data.data.map((event: any) => (
            <Box key={event.id} sx={{
              bgcolor: 'background.paper', borderRadius: '14px',
              border: '1px solid', borderColor: 'divider', p: 2.5,
              borderLeft: '4px solid', borderLeftColor: '#F97316',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} color="text.primary">
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.organizer?.organizationName}
                    {' · '}
                    {format(new Date(event.createdAt), 'd MMMM yyyy', { locale: ru })}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexShrink={0} sx={{ mt: { xs: 1, sm: 0 } }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => approveMutation.mutate(event.id)}
                    disabled={approveMutation.isPending}
                    sx={{ borderRadius: '10px' }}
                  >
                    Одобрить
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => setRejectDialog({ id: event.id, title: event.title })}
                    sx={{ borderRadius: '10px' }}
                  >
                    Отклонить
                  </Button>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {/* Диалог отклонения */}
      <Dialog
        open={!!rejectDialog}
        onClose={() => setRejectDialog(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Отклонить мероприятие</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            «{rejectDialog?.title}»
          </Typography>
          <TextField
            label="Причина отклонения"
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Укажите причину для организатора..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectDialog(null)} variant="outlined" sx={{ flex: 1 }}>
            Отмена
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => rejectMutation.mutate({ id: rejectDialog!.id, reason })}
            disabled={rejectMutation.isPending}
            sx={{ flex: 1 }}
          >
            Отклонить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Диалог создания сотрудника вуза ─────────────────────────────────────────

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

  const set = (k: string) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <School sx={{ color: '#92400E', fontSize: 20 }} />
          </Box>
          <Typography fontWeight={700}>Новый сотрудник вуза</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
          <Box sx={{
            p: 2, borderRadius: '10px', bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
          }}>
            <Typography variant="caption" color="#3730A3">
              Сотрудник сможет войти через обычную форму входа (/login) и получит доступ
              к кабинету администрации вуза.
            </Typography>
          </Box>
          <TextField label="Логин" size="small" fullWidth value={form.login} onChange={set('login')} />
          <TextField label="Email" type="email" size="small" fullWidth value={form.email} onChange={set('email')} />
          <TextField label="Пароль" type="password" size="small" fullWidth value={form.password}
            onChange={set('password')} helperText="Минимум 8 символов" />
          <TextField label="ФИО (необязательно)" size="small" fullWidth value={form.fullName}
            onChange={set('fullName')} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ flex: 1 }}>Отмена</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.login || !form.email || form.password.length < 8}
          sx={{ flex: 1 }}
        >
          {mutation.isPending ? <CircularProgress size={20} /> : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Вкладка: Пользователи ─────────────────────────────────────────────────────

function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createDeanOpen, setCreateDeanOpen] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string } | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDeleteUser(null);
    },
  });

  return (
    <Box>
      {/* Панель поиска */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Поиск по логину или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Роль</InputLabel>
          <Select value={roleFilter} label="Роль" onChange={(e) => setRoleFilter(e.target.value)}>
            <MenuItem value="">Все роли</MenuItem>
            <MenuItem value="STUDENT">Студент</MenuItem>
            <MenuItem value="ORGANIZER">Организатор</MenuItem>
            <MenuItem value="DEAN">Адм. вуза</MenuItem>
            <MenuItem value="ADMIN">Администратор</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<PersonAdd />}
          onClick={() => setCreateDeanOpen(true)}
          sx={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
        >
          Сотрудник вуза
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: '14px',
          border: '1px solid', borderColor: 'divider', overflow: 'hidden',
        }}>
          {data?.data?.map((user: any, idx: number) => {
            const name = user.studentProfile?.fullName
              ?? user.organizerProfile?.fullName
              ?? user.login;

            return (
              <Box key={user.id} sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2, p: 2,
                borderTop: idx > 0 ? '1px solid' : 'none',
                borderColor: 'divider',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
              }}>
                {/* Аватар */}
                <AvatarCircle name={name} role={user.role} />

                {/* Имя + логин + email */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography fontWeight={700} color="text.primary">{name}</Typography>
                    <RoleBadge role={user.role} />
                    {user.status === 'BLOCKED' && (
                      <Box sx={{
                        px: 1.5, py: 0.4, borderRadius: '20px',
                        fontSize: '0.72rem', fontWeight: 600,
                        color: '#991B1B', bgcolor: '#FEE2E2',
                      }}>
                        Заблокирован
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    @{user.login} · {user.email}
                    {user.lastLoginAt && (
                      ` · Вход: ${format(new Date(user.lastLoginAt), 'd MMM yyyy', { locale: ru })}`
                    )}
                  </Typography>
                </Box>

                {/* Действия */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  mt: { xs: 0.5, sm: 0 }, flexShrink: 0,
                }}>
                  {user.role !== 'ADMIN' && (
                    <FormControl size="small" sx={{ minWidth: 155 }}>
                      <Select
                        value={user.role}
                        onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value })}
                        disabled={roleMutation.isPending}
                      >
                        <MenuItem value="STUDENT">Студент</MenuItem>
                        <MenuItem value="ORGANIZER">Организатор</MenuItem>
                        <MenuItem value="DEAN">Адм. вуза</MenuItem>
                        <MenuItem value="ADMIN">Администратор</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  <Divider orientation="vertical" flexItem />

                  <Tooltip title={user.status === 'BLOCKED' ? 'Разблокировать' : 'Заблокировать'}>
                    <IconButton
                      size="small"
                      color={user.status === 'BLOCKED' ? 'success' : 'warning'}
                      onClick={() => blockMutation.mutate({
                        id: user.id,
                        status: user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
                      })}
                      disabled={blockMutation.isPending}
                    >
                      {user.status === 'BLOCKED'
                        ? <LockOpen fontSize="small" />
                        : <Block fontSize="small" />
                      }
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Удалить пользователя">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDeleteUser({ id: user.id, name })}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {createDeanOpen && <CreateDeanDialog onClose={() => setCreateDeanOpen(false)} />}

      {/* ── Диалог удаления пользователя ── */}
      <Dialog
        open={!!confirmDeleteUser}
        onClose={() => setConfirmDeleteUser(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Удалить пользователя?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" mb={2}>
            «{confirmDeleteUser?.name}»
          </Typography>
          <Box sx={{
            p: 2, borderRadius: '12px',
            bgcolor: '#FEF2F2', border: '1px solid #FECACA',
          }}>
            <Typography variant="body2" color="#991B1B">
              Пользователь будет безвозвратно удалён из системы вместе со всеми данными
              и историей регистраций.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmDeleteUser(null)} variant="outlined" sx={{ flex: 1 }}>
            Отмена
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteMutation.mutate(confirmDeleteUser!.id)}
            disabled={deleteMutation.isPending}
            sx={{ flex: 1 }}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Вкладка: Аналитика ───────────────────────────────────────────────────────

const PERIODS = [
  { value: 'day',   label: 'День' },
  { value: 'week',  label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year',  label: 'Год' },
];

function AnalyticsTab() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => adminApi.getAnalytics({ period }).then((r) => r.data),
  });

  const stats = [
    { label: 'Мероприятий создано', value: data?.eventsTotal, idx: 0 },
    { label: 'Активных пользователей', value: data?.activeUsers, idx: 1 },
    { label: 'Регистраций', value: data?.registrations, idx: 2 },
  ];

  return (
    <Box>
      {/* Фильтр периода */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {PERIODS.map((p) => {
          const active = p.value === period;
          return (
            <Box
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              sx={{
                px: 2, py: 0.75, borderRadius: '20px', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8125rem',
                border: '1.5px solid',
                transition: 'all .15s',
                ...(active
                  ? { bgcolor: 'primary.main', borderColor: 'primary.main', color: 'white' }
                  : { bgcolor: 'background.paper', borderColor: 'divider', color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.light', color: 'primary.main' } }
                ),
              }}
            >
              {p.label}
            </Box>
          );
        })}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Карточки статистики */}
          <Grid container spacing={2} mb={4}>
            {stats.map((s) => (
              <Grid item xs={12} sm={4} key={s.label}>
                <Box sx={{
                  borderRadius: '16px', p: 3,
                  background: STAT_CARD_COLORS[s.idx].bg,
                  color: STAT_CARD_COLORS[s.idx].text,
                }}>
                  <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1 }}>
                    {s.value ?? '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Топ мероприятий */}
          {data?.topEvents?.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Топ мероприятий
              </Typography>
              <Box sx={{
                bgcolor: 'background.paper', borderRadius: '14px',
                border: '1px solid', borderColor: 'divider', overflow: 'hidden',
              }}>
                {data.topEvents.map((e: any, idx: number) => (
                  <Box key={e.eventId} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 2,
                    borderTop: idx > 0 ? '1px solid' : 'none', borderColor: 'divider',
                  }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '50%',
                      bgcolor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F3F4F6' : '#FFF7ED',
                      color: idx === 0 ? '#92400E' : idx === 1 ? '#374151' : '#C2410C',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
                    }}>
                      {idx + 1}
                    </Box>
                    <Typography fontWeight={600} sx={{ flex: 1 }}>{e.name}</Typography>
                    <Box sx={{
                      px: 1.5, py: 0.4, borderRadius: '20px',
                      bgcolor: '#EEF2FF', color: '#4338CA',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}>
                      {e.attendees} уч.
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
