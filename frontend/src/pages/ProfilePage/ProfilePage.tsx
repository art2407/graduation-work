import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Avatar, Skeleton, Alert, Tab, Tabs,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, LinearProgress,
} from '@mui/material';
import {
  CalendarToday, QrCode, Close, Edit, Lock, School,
  Business, Phone, Groups, Logout,
} from '@mui/icons-material';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usersApi, attendanceApi, referencesApi } from '../../shared/api/client';
import {
  passwordSchema, getPasswordStrength, STRENGTH_LABELS, STRENGTH_COLORS,
} from '../../shared/utils/passwordValidation';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../shared/store/auth.store';
import { authApi } from '../../shared/api/client';

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  STUDENT:   { label: 'Студент',           color: '#065F46', bg: '#D1FAE5' },
  ORGANIZER: { label: 'Организатор',       color: '#4338CA', bg: '#EEF2FF' },
  ADMIN:     { label: 'Администратор',     color: '#991B1B', bg: '#FEE2E2' },
  DEAN:      { label: 'Администрация вуза', color: '#92400E', bg: '#FEF3C7' },
};

const REG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Зарегистрирован', color: '#4338CA', bg: '#EEF2FF' },
  ATTENDED:  { label: 'Посетил',         color: '#065F46', bg: '#D1FAE5' },
  CANCELLED: { label: 'Отменил',         color: '#6B7280', bg: '#F3F4F6' },
  NO_SHOW:   { label: 'Не пришёл',       color: '#92400E', bg: '#FEF3C7' },
};

// ── QR Modal ─────────────────────────────────────────────────
function QrModal({ registrationId, eventTitle, onClose }: {
  registrationId: string; eventTitle: string; onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['qr', registrationId],
    queryFn: () => attendanceApi.getStudentQr(registrationId).then((r) => r.data.qrDataUrl),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
        QR-код для входа
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>{eventTitle}</Typography>
        {isLoading && <Box p={4}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ borderRadius: '12px' }}>Не удалось загрузить QR-код</Alert>}
        {data && (
          <>
            <Box sx={{ p: 2, bgcolor: '#F8F7FF', borderRadius: '16px', display: 'inline-block' }}>
              <img src={data} alt="QR" style={{ width: '100%', maxWidth: 240, display: 'block', borderRadius: 8 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
              Покажите этот код организатору на входе
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: '10px' }}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────
function EditProfileModal({ profile, role, onClose }: { profile: any; role: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { data: institutes } = useQuery({
    queryKey: ['institutes', 'academic'],
    queryFn: () => referencesApi.getAcademicInstitutes().then((r) => r.data.institutes),
    enabled: role === 'STUDENT',
  });
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm({
    defaultValues: role === 'STUDENT' ? {
      fullName: profile?.fullName ?? '', phone: profile?.phone ?? '',
      group: profile?.group ?? '', yearOfStudy: profile?.yearOfStudy ?? '',
      instituteId: profile?.institute?.id ?? '',
    } : {
      fullName: profile?.fullName ?? '', position: profile?.position ?? '',
      contacts: profile?.contacts ?? '', organizationInfo: profile?.organizationInfo ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: any) => usersApi.updateMe(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me'] }); onClose(); },
    onError: (err: any) => setError(err.response?.data?.message || 'Ошибка сохранения'),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Редактировать профиль</DialogTitle>
      <DialogContent>
        <Box component="form" mt={1}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField {...register('fullName')} label="ФИО" fullWidth />
            </Grid>
            {role === 'STUDENT' && (<>
              <Grid item xs={12} sm={6}>
                <TextField {...register('phone')} label="Телефон" fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField {...register('group')} label="Учебная группа" fullWidth
                  placeholder="ИКБО-04-24" helperText="Формат: ИКБО-04-24"
                  inputProps={{ style: { textTransform: 'uppercase' } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField {...register('yearOfStudy')} label="Курс (1–6)" type="number"
                  fullWidth inputProps={{ min: 1, max: 6 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Институт</InputLabel>
                  <Controller name="instituteId" control={control} defaultValue=""
                    render={({ field }) => (
                      <Select {...field} label="Институт">
                        <MenuItem value="">— Не указан —</MenuItem>
                        {institutes?.map((i: any) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
                      </Select>
                    )} />
                </FormControl>
              </Grid>
            </>)}
            {role === 'ORGANIZER' && (<>
              <Grid item xs={12}>
                <TextField {...register('position')} label="Должность" fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('contacts')} label="Контакты" fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('organizationInfo')} label="Об организации" fullWidth multiline rows={3} />
              </Grid>
            </>)}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ flex: 1, borderRadius: '10px' }}>Отмена</Button>
        <Button variant="contained" sx={{ flex: 1, borderRadius: '10px' }}
          onClick={handleSubmit((data) => mutation.mutate(data))}
          disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={20} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Change Password Modal ─────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const pwdStrength = newPwd ? getPasswordStrength(newPwd) : null;
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => usersApi.changePassword(data),
    onSuccess: () => setSuccess(true),
    onError: (err: any) => setError(err.response?.data?.message || 'Ошибка смены пароля'),
  });
  const onSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) { setError('Пароли не совпадают'); return; }
    const r = passwordSchema.safeParse(data.newPassword);
    if (!r.success) { setError(r.error.errors[0].message); return; }
    setError(''); mutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Сменить пароль</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1, borderRadius: '10px' }}>Пароль успешно изменён!</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
            <TextField {...register('currentPassword')} label="Текущий пароль" type="password" fullWidth />
            <Box>
              <TextField {...register('newPassword')} label="Новый пароль" type="password" fullWidth
                helperText="Мин. 8 символов, буква и цифра"
                onChange={(e) => setNewPwd(e.target.value)} />
              {pwdStrength && (
                <Box mt={0.75}>
                  <LinearProgress variant="determinate"
                    value={pwdStrength === 'weak' ? 33 : pwdStrength === 'medium' ? 66 : 100}
                    color={STRENGTH_COLORS[pwdStrength]} sx={{ height: 4, borderRadius: 2 }} />
                  <Typography variant="caption" color={`${STRENGTH_COLORS[pwdStrength]}.main`} fontWeight={600}>
                    {STRENGTH_LABELS[pwdStrength]}
                  </Typography>
                </Box>
              )}
            </Box>
            <TextField {...register('confirmPassword')} label="Повторите пароль" type="password" fullWidth />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ flex: 1, borderRadius: '10px' }}>
          {success ? 'Закрыть' : 'Отмена'}
        </Button>
        {!success && (
          <Button variant="contained" onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || mutation.isPending} sx={{ flex: 1, borderRadius: '10px' }}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'Сменить'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Info chip ─────────────────────────────────────────────────
function InfoChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75,
      bgcolor: '#F8F7FF', borderRadius: '10px', px: 1.5, py: 0.75,
      border: '1px solid #E9E7F9',
    }}>
      <Box sx={{ color: 'primary.light', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography variant="body2" color="text.primary" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout, refreshToken } = useAuthStore();
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

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    logout(); navigate('/events');
  };

  if (isLoading) return (
    <Box maxWidth={700} mx="auto">
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: '20px', mb: 3 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '16px' }} />
    </Box>
  );
  if (!profile) return <Alert severity="error">Не удалось загрузить профиль</Alert>;

  const profileData = profile.studentProfile ?? profile.organizerProfile;
  const displayName = profileData?.fullName ?? profile.login;
  const roleMeta = ROLE_META[profile.role] ?? { label: profile.role, color: '#374151', bg: '#F3F4F6' };

  return (
    <Box maxWidth={700} mx="auto">

      {/* ── Шапка профиля ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        borderRadius: '20px', p: { xs: 2.5, sm: 3.5 }, mb: 3,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Декоративный круг */}
        <Box sx={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,.08)',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
          <Avatar sx={{
            width: 72, height: 72, fontSize: 28, fontWeight: 800,
            bgcolor: 'rgba(255,255,255,.2)', color: 'white', flexShrink: 0,
            border: '2px solid rgba(255,255,255,.3)',
          }}>
            {displayName[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} color="white"
              sx={{ mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.75)', mb: 1 }}>
              @{profile.login} · {profile.email}
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              bgcolor: roleMeta.bg, color: roleMeta.color,
              fontSize: '0.75rem', fontWeight: 700,
              px: 1.25, py: 0.375, borderRadius: '8px',
            }}>
              {roleMeta.label}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Данные профиля ── */}
      <Box sx={{
        bgcolor: 'background.paper', borderRadius: '16px',
        border: '1px solid #E9E7F9', p: { xs: 2, sm: 2.5 }, mb: 3,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" color="text.primary">Мои данные</Typography>
          {(profile.role === 'STUDENT' || profile.role === 'ORGANIZER') && (
            <Button size="small" startIcon={<Edit />} variant="outlined"
              onClick={() => setEditOpen(true)} sx={{ borderRadius: '8px' }}>
              Изменить
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {profile.studentProfile && (<>
            {profile.studentProfile.institute && (
              <InfoChip icon={<School sx={{ fontSize: 15 }} />} value={profile.studentProfile.institute.name} />
            )}
            {profile.studentProfile.group && (
              <InfoChip icon={<Groups sx={{ fontSize: 15 }} />} value={profile.studentProfile.group} />
            )}
            {profile.studentProfile.yearOfStudy && (
              <InfoChip icon={<School sx={{ fontSize: 15 }} />} value={`${profile.studentProfile.yearOfStudy} курс`} />
            )}
            {profile.studentProfile.phone && (
              <InfoChip icon={<Phone sx={{ fontSize: 15 }} />} value={profile.studentProfile.phone} />
            )}
          </>)}
          {profile.organizerProfile && (<>
            <InfoChip icon={<Business sx={{ fontSize: 15 }} />} value={profile.organizerProfile.organizationName} />
            {profile.organizerProfile.position && (
              <InfoChip icon={<Groups sx={{ fontSize: 15 }} />} value={profile.organizerProfile.position} />
            )}
            {profile.organizerProfile.contacts && (
              <InfoChip icon={<Phone sx={{ fontSize: 15 }} />} value={profile.organizerProfile.contacts} />
            )}
          </>)}
          {!profile.studentProfile && !profile.organizerProfile && (
            <Typography variant="body2" color="text.secondary">Данные профиля не заполнены</Typography>
          )}
        </Box>
      </Box>

      {/* ── Вкладки для студента ── */}
      {profile.role === 'STUDENT' && (
        <Box sx={{ mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{
              mb: 2,
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 0 },
              '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
            }}>
            <Tab label="Информация" />
            <Tab label="История мероприятий" />
          </Tabs>

          {tab === 1 && (
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid #E9E7F9', overflow: 'hidden' }}>
              {!history?.data?.length ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '14px', bgcolor: '#EEF2FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 1.5,
                  }}>
                    <CalendarToday sx={{ color: 'primary.light', fontSize: 26 }} />
                  </Box>
                  <Typography variant="subtitle2" color="text.primary">Нет мероприятий</Typography>
                  <Typography variant="body2" color="text.secondary">Вы ещё не регистрировались</Typography>
                </Box>
              ) : (
                <Box>
                  {history.data.map((reg: any, i: number) => {
                    const st = REG_STATUS[reg.status] ?? { label: reg.status, color: '#374151', bg: '#F3F4F6' };
                    return (
                      <Box
                        key={reg.id}
                        onClick={() => navigate(`/events/${reg.event.id}`)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: 1.75, cursor: 'pointer',
                          borderTop: i > 0 ? '1px solid #E9E7F9' : 'none',
                          '&:hover': { bgcolor: '#F8F7FF' },
                          transition: 'background .15s',
                        }}
                      >
                        <Box sx={{
                          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                          background: COVER_GRADIENT_MINI[reg.event.type] ?? '#6B7280',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CalendarToday sx={{ color: 'white', fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" color="text.primary"
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {reg.event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(reg.event.startAt), 'd MMM yyyy', { locale: ru })}
                            {reg.event.organizer?.organizationName && ` · ${reg.event.organizer.organizationName}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                          {reg.status === 'CONFIRMED' && (
                            <IconButton size="small"
                              onClick={(e) => { e.stopPropagation(); setQrModal({ id: reg.id, title: reg.event.title }); }}
                              sx={{ bgcolor: '#EEF2FF', color: 'primary.main', '&:hover': { bgcolor: '#E0E7FF' } }}>
                              <QrCode fontSize="small" />
                            </IconButton>
                          )}
                          <Box sx={{
                            bgcolor: st.bg, color: st.color,
                            fontSize: '0.7rem', fontWeight: 700,
                            px: 1.25, py: 0.375, borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}>
                            {st.label}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ── Действия ── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<Lock />}
          onClick={() => setPwdOpen(true)} sx={{ borderRadius: '10px' }}>
          Сменить пароль
        </Button>
        <Button variant="outlined" color="error" startIcon={<Logout />}
          onClick={handleLogout} sx={{ borderRadius: '10px' }}>
          Выйти
        </Button>
      </Box>

      {qrModal && <QrModal registrationId={qrModal.id} eventTitle={qrModal.title} onClose={() => setQrModal(null)} />}
      {editOpen && <EditProfileModal profile={profileData} role={profile.role} onClose={() => setEditOpen(false)} />}
      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </Box>
  );
}

// Мини-версия градиентов для иконок истории
const COVER_GRADIENT_MINI: Record<string, string> = {
  academic: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
  hackathon:'linear-gradient(135deg,#4F46E5,#7C3AED)',
  career:   'linear-gradient(135deg,#0EA5E9,#6366F1)',
  cultural: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
  sport:    'linear-gradient(135deg,#10B981,#0EA5E9)',
  social:   'linear-gradient(135deg,#F97316,#EC4899)',
  volunteer:'linear-gradient(135deg,#10B981,#059669)',
  other:    'linear-gradient(135deg,#6B7280,#374151)',
};
