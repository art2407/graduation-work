import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Stack, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  EventNote, People, BarChart, Download, Visibility,
  CalendarToday, LocationOn, Groups,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { universityApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';

const STATUS_LABELS: Record<string, { label: string; color: any }> = {
  MODERATION: { label: 'На модерации', color: 'warning' },
  PUBLISHED: { label: 'Опубликовано', color: 'success' },
  COMPLETED: { label: 'Завершено', color: 'default' },
  CANCELLED: { label: 'Отменено', color: 'error' },
  REJECTED: { label: 'Отклонено', color: 'error' },
};

const REG_STATUS: Record<string, { label: string; color: any }> = {
  CONFIRMED: { label: 'Записан', color: 'primary' },
  ATTENDED: { label: 'Посетил', color: 'success' },
  CANCELLED: { label: 'Отменил', color: 'default' },
  NO_SHOW: { label: 'Не пришёл', color: 'warning' },
};

export default function UniversityPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Кабинет администрации вуза
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Мониторинг студенческих мероприятий · {user?.login}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<BarChart />} iconPosition="start" label="Сводка" />
        <Tab icon={<EventNote />} iconPosition="start" label="Мероприятия" />
      </Tabs>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <EventsTab />}
    </Box>
  );
}

// ── Сводка ──────────────────────────────────────────────────────────────────

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
      <FormControl size="small" sx={{ mb: 3, minWidth: 280 }}>
        <InputLabel>Фильтр по институту</InputLabel>
        <Select
          value={instituteId}
          label="Фильтр по институту"
          onChange={(e) => setInstituteId(e.target.value)}
        >
          <MenuItem value="">Все институты</MenuItem>
          {institutes?.map((inst: any) => (
            <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <Grid container spacing={3} mb={4}>
            {[
              { label: 'Всего мероприятий', value: data?.totalEvents, color: 'primary.main', icon: <EventNote /> },
              { label: 'Предстоящих', value: data?.upcoming, color: 'success.main', icon: <CalendarToday /> },
              { label: 'Завершённых', value: data?.past, color: 'text.secondary', icon: <EventNote /> },
              { label: 'Студентов в системе', value: data?.totalStudents, color: 'secondary.main', icon: <People /> },
              { label: 'Регистраций', value: data?.totalRegistrations, color: 'warning.main', icon: <Groups /> },
            ].map((item) => (
              <Grid item xs={6} sm={4} md={2.4} key={item.label}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight={700} color={item.color}>
                      {item.value ?? '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {data?.topEvents?.length > 0 && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>Топ мероприятий по участникам</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Мероприятие</TableCell>
                      <TableCell>Институт</TableCell>
                      <TableCell>Дата</TableCell>
                      <TableCell align="right">Участников</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topEvents.map((e: any, idx: number) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{e.title}</TableCell>
                        <TableCell>{e.institute ?? '—'}</TableCell>
                        <TableCell>
                          {format(new Date(e.startAt), 'd MMM yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={e.registrations} color="primary" size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

// ── Мероприятия ─────────────────────────────────────────────────────────────

function EventsTab() {
  const [search, setSearch] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [attendeesEvent, setAttendeesEvent] = useState<any>(null);

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
      {/* Фильтры */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
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
              <Select value={instituteId} label="Институт" onChange={(e) => setInstituteId(e.target.value)}>
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
      </Paper>

      {/* Таблица */}
      {isLoading ? (
        <CircularProgress />
      ) : !data?.data?.length ? (
        <Alert severity="info">Мероприятия не найдены</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><b>Мероприятие</b></TableCell>
                <TableCell><b>Институт</b></TableCell>
                <TableCell><b>Организатор</b></TableCell>
                <TableCell><b>Дата</b></TableCell>
                <TableCell><b>Адрес</b></TableCell>
                <TableCell align="center"><b>Участников</b></TableCell>
                <TableCell align="center"><b>Статус</b></TableCell>
                <TableCell align="center"><b>Действия</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((event: any) => (
                <TableRow key={event.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {event.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{event.institute?.name ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{event.organizer.organizationName}</Typography>
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
                    <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                      <LocationOn fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.3 }} />
                      {event.address}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={event.registrationsCount}
                      size="small"
                      color={event.registrationsCount > 0 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={STATUS_LABELS[event.status]?.label ?? event.status}
                      color={STATUS_LABELS[event.status]?.color ?? 'default'}
                      size="small"
                    />
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
                          color="success"
                          component="a"
                          href={universityApi.getExportUrl(event.id)}
                          download
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data?.pagination && (
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Показано {data.data?.length} из {data.pagination.total}
        </Typography>
      )}

      {/* Модал участников */}
      {attendeesEvent && (
        <AttendeesDialog
          event={attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}
    </Box>
  );
}

// ── Диалог участников ────────────────────────────────────────────────────────

function AttendeesDialog({ event, onClose }: { event: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['university-attendees', event.id],
    queryFn: () => universityApi.getAttendees(event.id, { limit: 500 }).then((r) => r.data),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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
            component="a"
            href={universityApi.getExportUrl(event.id)}
            download
          >
            CSV
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : !data?.data?.length ? (
          <Alert severity="info">Нет зарегистрированных участников</Alert>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
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
                {data.data.map((reg: any, idx: number) => {
                  const sp = reg.user?.studentProfile;
                  return (
                    <TableRow key={reg.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{sp?.fullName ?? '—'}</TableCell>
                      <TableCell>{sp?.group ?? '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{sp?.institute?.name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{reg.user?.email}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={REG_STATUS[reg.status]?.label ?? reg.status}
                          color={REG_STATUS[reg.status]?.color ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {reg.checkedInAt ? (
                          <Typography variant="caption" color="success.main">
                            {format(new Date(reg.checkedInAt), 'HH:mm')}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 1 }}>
          Всего: {data?.pagination?.total ?? 0} участников
        </Typography>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
