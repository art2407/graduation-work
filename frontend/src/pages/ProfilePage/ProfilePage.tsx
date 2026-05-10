import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Avatar, Chip, Divider, Stack, Skeleton, Alert,
  List, ListItemButton, ListItemText, ListItemSecondaryAction, Tab, Tabs,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid,
} from '@mui/material';
import { CalendarToday, QrCode, Close, Edit, Lock } from '@mui/icons-material';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usersApi, attendanceApi, referencesApi } from '../../shared/api/client';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Студент', ORGANIZER: 'Организатор', ADMIN: 'Администратор', DEAN: 'Администрация вуза',
};

const REG_STATUS: Record<string, { label: string; color: any }> = {
  CONFIRMED: { label: 'Зарегистрирован', color: 'primary' },
  ATTENDED: { label: 'Посетил', color: 'success' },
  CANCELLED: { label: 'Отменил', color: 'default' },
  NO_SHOW: { label: 'Не пришёл', color: 'warning' },
};

// ── QR Modal ────────────────────────────────────────────────────────────────
function QrModal({ registrationId, eventTitle, onClose }: {
  registrationId: string; eventTitle: string; onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['qr', registrationId],
    queryFn: () => attendanceApi.getStudentQr(registrationId).then((r) => r.data.qrDataUrl),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        QR-код для входа
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
          {eventTitle}
        </Typography>
        {isLoading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
        {error && <Alert severity="error">Не удалось загрузить QR-код</Alert>}
        {data && (
          <Box textAlign="center">
            <img src={data} alt="QR код" style={{ width: '100%', maxWidth: 300, borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Покажите этот код организатору на входе
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" fullWidth>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ profile, role, onClose }: {
  profile: any; role: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: institutes } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
    enabled: role === 'STUDENT',
  });

  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm({
    defaultValues: role === 'STUDENT' ? {
      fullName: profile?.fullName ?? '',
      phone: profile?.phone ?? '',
      group: profile?.group ?? '',
      yearOfStudy: profile?.yearOfStudy ?? '',
      instituteId: profile?.institute?.id ?? '',
    } : {
      fullName: profile?.fullName ?? '',
      position: profile?.position ?? '',
      contacts: profile?.contacts ?? '',
      organizationInfo: profile?.organizationInfo ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => usersApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Ошибка сохранения'),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Редактировать профиль</DialogTitle>
      <DialogContent>
        <Box component="form" mt={1}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField {...register('fullName')} label="ФИО" fullWidth size="small" />
            </Grid>
            {role === 'STUDENT' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField {...register('phone')} label="Телефон" fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField {...register('group')} label="Учебная группа" fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField {...register('yearOfStudy')} label="Курс (1–6)" type="number"
                    fullWidth size="small" inputProps={{ min: 1, max: 6 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Институт</InputLabel>
                    <Controller name="instituteId" control={control} defaultValue=""
                      render={({ field }) => (
                        <Select {...field} label="Институт">
                          <MenuItem value="">— Не указан —</MenuItem>
                          {institutes?.map((i: any) => (
                            <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
              </>
            )}
            {role === 'ORGANIZER' && (
              <>
                <Grid item xs={12}>
                  <TextField {...register('position')} label="Должность" fullWidth size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField {...register('contacts')} label="Контакты" fullWidth size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField {...register('organizationInfo')} label="Об организации"
                    fullWidth size="small" multiline rows={3} />
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained"
          onClick={handleSubmit((data) => mutation.mutate(data))}
          disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(data),
    onSuccess: () => setSuccess(true),
    onError: (err: any) => setError(err.response?.data?.message || 'Ошибка смены пароля'),
  });

  const onSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    setError('');
    mutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Сменить пароль</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>Пароль успешно изменён!</Alert>
        ) : (
          <Stack spacing={2} mt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField {...register('currentPassword')} label="Текущий пароль"
              type="password" fullWidth size="small" />
            <TextField {...register('newPassword')} label="Новый пароль (мин. 8 символов)"
              type="password" fullWidth size="small" />
            <TextField {...register('confirmPassword')} label="Повторите новый пароль"
              type="password" fullWidth size="small" />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{success ? 'Закрыть' : 'Отмена'}</Button>
        {!success && (
          <Button variant="contained" onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'Сменить'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [qrModal, setQrModal] = useState<{ id: string; title: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then((r) => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ['events-history'],
    queryFn: () => usersApi.getEventsHistory().then((r) => r.data),
    enabled: tab === 1,
  });

  if (isLoading) return (
    <Box>
      <Skeleton variant="circular" width={80} height={80} sx={{ mb: 2 }} />
      <Skeleton height={40} sx={{ mb: 1 }} />
      <Skeleton height={200} />
    </Box>
  );

  if (!profile) return <Alert severity="error">Не удалось загрузить профиль</Alert>;

  const profileData = profile.studentProfile ?? profile.organizerProfile;
  const displayName = profileData?.fullName ?? profile.login;

  return (
    <Box maxWidth={800} mx="auto">
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <Avatar sx={{ width: 80, height: 80, fontSize: 32, bgcolor: 'primary.main', flexShrink: 0 }}>
            {displayName[0].toUpperCase()}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h5" fontWeight={700}>{displayName}</Typography>
            <Typography color="text.secondary">@{profile.login}</Typography>
            <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={0.5}>
              <Chip label={ROLE_LABELS[profile.role]} color="primary" size="small" />
              <Chip label={profile.email} variant="outlined" size="small" />
            </Stack>
          </Box>
          {/* Кнопки управления аккаунтом */}
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<Edit />} variant="outlined"
              onClick={() => setEditOpen(true)}>
              Изменить
            </Button>
            <Button size="small" startIcon={<Lock />} variant="outlined" color="warning"
              onClick={() => setPwdOpen(true)}>
              Пароль
            </Button>
          </Stack>
        </Stack>

        {profile.studentProfile && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap">
              {profile.studentProfile.institute && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Институт</Typography>
                  <Typography>{profile.studentProfile.institute.name}</Typography>
                </Box>
              )}
              {profile.studentProfile.group && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Группа</Typography>
                  <Typography>{profile.studentProfile.group}</Typography>
                </Box>
              )}
              {profile.studentProfile.yearOfStudy && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Курс</Typography>
                  <Typography>{profile.studentProfile.yearOfStudy}</Typography>
                </Box>
              )}
              {profile.studentProfile.phone && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Телефон</Typography>
                  <Typography>{profile.studentProfile.phone}</Typography>
                </Box>
              )}
            </Stack>
          </>
        )}

        {profile.organizerProfile && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">Организация</Typography>
                <Typography fontWeight={600}>{profile.organizerProfile.organizationName}</Typography>
              </Box>
              {profile.organizerProfile.position && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Должность</Typography>
                  <Typography>{profile.organizerProfile.position}</Typography>
                </Box>
              )}
              {profile.organizerProfile.contacts && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Контакты</Typography>
                  <Typography>{profile.organizerProfile.contacts}</Typography>
                </Box>
              )}
            </Stack>
          </>
        )}
      </Paper>

      {profile.role === 'STUDENT' && (
        <Box>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Информация" />
            <Tab label="История мероприятий" />
          </Tabs>

          {tab === 1 && (
            <Paper elevation={1}>
              {!history?.data?.length ? (
                <Box p={4} textAlign="center">
                  <Typography color="text.secondary">Вы ещё не записывались на мероприятия</Typography>
                </Box>
              ) : (
                <List>
                  {history.data.map((reg: any) => (
                    <ListItemButton
                      key={reg.id}
                      onClick={() => navigate(`/events/${reg.event.id}`)}
                      divider
                      sx={{ pr: reg.status === 'CONFIRMED' ? 14 : 8 }}
                    >
                      <ListItemText
                        primary={reg.event.title}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarToday fontSize="inherit" />
                            <span>{format(new Date(reg.event.startAt), 'd MMMM yyyy', { locale: ru })}</span>
                            <span>• {reg.event.organizer?.organizationName}</span>
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {reg.status === 'CONFIRMED' && (
                            <IconButton size="small" color="primary"
                              onClick={(e) => { e.stopPropagation(); setQrModal({ id: reg.id, title: reg.event.title }); }}
                              title="Показать QR-код">
                              <QrCode />
                            </IconButton>
                          )}
                          <Chip
                            label={REG_STATUS[reg.status]?.label ?? reg.status}
                            color={REG_STATUS[reg.status]?.color ?? 'default'}
                            size="small"
                          />
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Box>
      )}

      {qrModal && (
        <QrModal registrationId={qrModal.id} eventTitle={qrModal.title} onClose={() => setQrModal(null)} />
      )}
      {editOpen && (
        <EditProfileModal
          profile={profileData}
          role={profile.role}
          onClose={() => setEditOpen(false)}
        />
      )}
      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </Box>
  );
}
