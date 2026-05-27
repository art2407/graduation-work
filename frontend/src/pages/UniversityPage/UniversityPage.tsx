import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDownloadCsv } from '../../shared/hooks/useDownloadCsv';
import {
  Box, Typography, Tabs, Tab, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Stack, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  EventNote, People, BarChart, Download, Visibility,
  CalendarToday, Groups, LocationOn,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { universityApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  MODERATION: { label: 'На модерации', color: '#92400E', bg: '#FEF3C7' },
  PUBLISHED:  { label: 'Опубликовано', color: '#065F46', bg: '#D1FAE5' },
  COMPLETED:  { label: 'Завершено',   color: '#1E40AF', bg: '#DBEAFE' },
  CANCELLED:  { label: 'Отменено',   color: '#374151', bg: '#F3F4F6' },
  REJECTED:   { label: 'Отклонено',  color: '#991B1B', bg: '#FEE2E2' },
};

const REG_STATUS: Record<string, { label: string; color: any }> = {
  CONFIRMED: { label: 'Записан',    color: 'primary' },
  ATTENDED:  { label: 'Посетил',   color: 'success' },
  CANCELLED: { label: 'Отменил',   color: 'default' },
  NO_SHOW:   { label: 'Не пришёл', color: 'warning' },
};

// ── Главный компонент ────────────────────────────────────────────────────────

export default function UniversityPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
          Кабинет администрации вуза
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.25}>
          Мониторинг студенческих мероприятий · {user?.login}
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
        <Tab icon={<BarChart fontSize="small" />} iconPosition="start" label="Сводка" />
        <Tab icon={<EventNote fontSize="small" />} iconPosition="start" label="Мероприятия" />
      </Tabs>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <EventsTab />}
    </Box>
  );
}

// ── Вкладка: Сводка ──────────────────────────────────────────────────────────

const DASHBOARD_STATS = [
  { key: 'totalEvents',        label: 'Всего мероприятий', color: '#4F46E5', bg: '#EEF2FF', icon: <EventNote sx={{ color: '#4F46E5', fontSize: 20 }} /> },
  { key: 'upcoming',           label: 'Предстоящих',       color: '#065F46', bg: '#D1FAE5', icon: <CalendarToday sx={{ color: '#065F46', fontSize: 20 }} /> },
  { key: 'past',               label: 'Завершённых',       color: '#374151', bg: '#F3F4F6', icon: <EventNote sx={{ color: '#374151', fontSize: 20 }} /> },
  { key: 'totalStudents',      label: 'Студентов',         color: '#C2410C', bg: '#FFF7ED', icon: <People sx={{ color: '#C2410C', fontSize: 20 }} /> },
  { key: 'totalRegistrations', label: 'Регистраций',       color: '#92400E', bg: '#FEF3C7', icon: <Groups sx={{ color: '#92400E', fontSize: 20 }} /> },
];

function DashboardTab() {
  const [instituteId, setInstituteId] = useState('');

  const { data: institutes } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['university-dashboard', instituteId],
    queryFn: () => universityApi.getDashboard(instituteId || undefined).then((r) => r.data),
  });

  return (
    <Box>
      {/* Фильтр по институту */}
      <FormControl size="small" fullWidth sx={{ mb: 3, maxWidth: { sm: 380 } }}>
        <InputLabel>Фильтр по институту</InputLabel>
        <Select
          value={instituteId}
          label="Фильтр по институту"
          onChange={(e) => setInstituteId(e.target.value)}
          MenuProps={{
            PaperProps: {
              sx: {
                maxWidth: 'min(400px, calc(100vw - 32px))',
                '& .MuiMenuItem-root': { whiteSpace: 'normal', lineHeight: 1.4 },
              },
            },
          }}
        >
          <MenuItem value="">Все институты</MenuItem>
          {institutes?.map((inst: any) => (
            <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Карточки статистики */}
          <Grid container spacing={2} mb={4}>
            {DASHBOARD_STATS.map((s) => (
              <Grid item xs={6} sm={4} md={2.4} key={s.key}>
                <Box sx={{
                  bgcolor: s.bg, borderRadius: '14px',
                  p: 2, border: `1px solid ${s.bg}`,
                }}>
                  <Box sx={{ mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight={800} color={s.color} sx={{ lineHeight: 1 }}>
                    {(data as any)?.[s.key] ?? '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Топ мероприятий */}
          {(data as any)?.topEvents?.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Топ мероприятий по участникам
              </Typography>
              <Box sx={{
                bgcolor: 'background.paper', borderRadius: '14px',
                border: '1px solid', borderColor: 'divider', overflow: 'hidden',
              }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' } }}>
                        <TableCell>#</TableCell>
                        <TableCell>Мероприятие</TableCell>
                        <TableCell>Институт</TableCell>
                        <TableCell>Дата</TableCell>
                        <TableCell align="right">Участников</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data as any).topEvents.map((e: any, idx: number) => (
                        <TableRow key={e.id} hover>
                          <TableCell>
                            <Box sx={{
                              width: 24, height: 24, borderRadius: '50%',
                              bgcolor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F3F4F6' : '#FFF7ED',
                              color: idx === 0 ? '#92400E' : idx === 1 ? '#374151' : '#C2410C',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.75rem',
                            }}>
                              {idx + 1}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{e.institute ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {format(new Date(e.startAt), 'd MMM yyyy', { locale: ru })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{
                              px: 1.5, py: 0.3, borderRadius: '20px', display: 'inline-block',
                              bgcolor: '#EEF2FF', color: '#4338CA', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                              {e.registrations}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ── Вкладка: Мероприятия ─────────────────────────────────────────────────────

function EventsTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [attendeesEvent, setAttendeesEvent] = useState<any>(null);
  const [csvLoading, setCsvLoading] = useState<string | null>(null);
  const downloadCsv = useDownloadCsv();

  const { data: institutes } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['university-events', search, instituteId, status, dateFrom, dateTo],
    queryFn: () => universityApi.getEvents({
      search: search || undefined,
      instituteId: instituteId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 50,
    }).then((r) => r.data),
  });

  return (
    <Box>
      {/* ── Фильтры ── */}
      <Box sx={{
        bgcolor: 'background.paper', borderRadius: '14px',
        border: '1px solid', borderColor: 'divider', p: 2, mb: 2,
      }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Институт</InputLabel>
              <Select
                value={instituteId}
                label="Институт"
                onChange={(e) => setInstituteId(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxWidth: 'min(400px, calc(100vw - 32px))',
                      '& .MuiMenuItem-root': { whiteSpace: 'normal', lineHeight: 1.4 },
                    },
                  },
                }}
              >
                <MenuItem value="">Все</MenuItem>
                {institutes?.map((inst: any) => (
                  <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select value={status} label="Статус" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="PUBLISHED">Опубликовано</MenuItem>
                <MenuItem value="MODERATION">На модерации</MenuItem>
                <MenuItem value="COMPLETED">Завершено</MenuItem>
                <MenuItem value="CANCELLED">Отменено</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={1.5}>
            <TextField
              label="Дата от"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} sm={1.5}>
            <TextField
              label="Дата до"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* ── Таблица ── */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !data?.data?.length ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>Мероприятия не найдены</Alert>
      ) : (
        <>
          <TableContainer sx={{
            bgcolor: 'background.paper', borderRadius: '14px',
            border: '1px solid', borderColor: 'divider', overflow: 'auto',
          }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{
                  bgcolor: '#F8F7FF',
                  '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' },
                }}>
                  <TableCell sx={{ minWidth: 220 }}>Мероприятие</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Институт</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Организатор</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Дата</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Адрес</TableCell>
                  <TableCell align="center" sx={{ minWidth: 70 }}>Уч-ков</TableCell>
                  <TableCell align="center" sx={{ minWidth: 110 }}>Статус</TableCell>
                  <TableCell align="center" sx={{ minWidth: 80 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((event: any) => {
                  const st = STATUS_LABELS[event.status];
                  return (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          onClick={() => navigate(`/events/${event.id}`)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                          }}
                        >
                          {event.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                          {event.institute?.name ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {event.organizer?.organizationName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0}>
                          <Typography variant="caption" fontWeight={600}>
                            {format(new Date(event.startAt), 'd MMM yyyy', { locale: ru })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(event.startAt), 'HH:mm')}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="inherit" sx={{ flexShrink: 0 }} />
                          {event.address}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{
                          px: 1.5, py: 0.3, borderRadius: '20px', display: 'inline-block',
                          bgcolor: event.registrationsCount > 0 ? '#EEF2FF' : '#F3F4F6',
                          color: event.registrationsCount > 0 ? '#4338CA' : '#374151',
                          fontSize: '0.8rem', fontWeight: 700,
                        }}>
                          {event.registrationsCount}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {st ? (
                          <Box sx={{
                            px: 1.5, py: 0.3, borderRadius: '20px', display: 'inline-block',
                            bgcolor: st.bg, color: st.color,
                            fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            {st.label}
                          </Box>
                        ) : (
                          <Typography variant="caption">{event.status}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Список участников">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setAttendeesEvent(event)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Скачать CSV">
                            <IconButton
                              size="small"
                              sx={{ color: '#065F46' }}
                              disabled={csvLoading === event.id}
                              onClick={async () => {
                                setCsvLoading(event.id);
                                try {
                                  await downloadCsv(
                                    `/university/events/${event.id}/attendees/export`,
                                    `participants-${event.id}.csv`,
                                  );
                                } finally { setCsvLoading(null); }
                              }}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data?.pagination && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Показано {data.data?.length} из {data.pagination.total}
            </Typography>
          )}
        </>
      )}

      {attendeesEvent && (
        <AttendeesDialog event={attendeesEvent} onClose={() => setAttendeesEvent(null)} />
      )}
    </Box>
  );
}

// ── Диалог участников ────────────────────────────────────────────────────────

function AttendeesDialog({ event, onClose }: { event: any; onClose: () => void }) {
  const downloadCsv = useDownloadCsv();

  const { data, isLoading } = useQuery({
    queryKey: ['university-attendees', event.id],
    queryFn: () => universityApi.getAttendees(event.id, { limit: 500 }).then((r) => r.data),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography fontWeight={700}>{event.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
              {event.institute?.name && ` · ${event.institute.name}`}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            sx={{ borderRadius: '10px' }}
            onClick={() => downloadCsv(
              `/university/events/${event.id}/attendees/export`,
              `participants-${event.id}.csv`,
            )}
          >
            CSV
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : !data?.data?.filter((r: any) => r.status !== 'CANCELLED').length ? (
          <Alert severity="info" sx={{ borderRadius: '10px' }}>
            Нет зарегистрированных участников
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F8F7FF', fontSize: '0.75rem' } }}>
                  <TableCell>#</TableCell>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Группа</TableCell>
                  <TableCell>Институт</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Статус</TableCell>
                  <TableCell>Чек-ин</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.filter((r: any) => r.status !== 'CANCELLED').map((reg: any, idx: number) => {
                  const sp = reg.user?.studentProfile;
                  const rs = REG_STATUS[reg.status];
                  return (
                    <TableRow key={reg.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{sp?.fullName ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{sp?.group ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {sp?.institute?.name ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{reg.user?.email}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={rs?.label ?? reg.status}
                          color={rs?.color ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {reg.checkedInAt ? (
                          <Typography variant="caption" color="success.main" fontWeight={600}>
                            {format(new Date(reg.checkedInAt), 'HH:mm')}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          Участников (без отменённых): {data?.data?.filter((r: any) => r.status !== 'CANCELLED').length ?? 0}
        </Typography>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
