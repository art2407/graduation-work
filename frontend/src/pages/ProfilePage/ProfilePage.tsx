import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Avatar, Chip, Divider, Stack, Skeleton, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction, Tab, Tabs,
} from '@mui/material';
import { CalendarToday, CheckCircle, Cancel } from '@mui/icons-material';
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usersApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Студент', ORGANIZER: 'Организатор', ADMIN: 'Администратор',
};

const REG_STATUS: Record<string, { label: string; color: any }> = {
  CONFIRMED: { label: 'Зарегистрирован', color: 'primary' },
  ATTENDED: { label: 'Посетил', color: 'success' },
  CANCELLED: { label: 'Отменил', color: 'default' },
  NO_SHOW: { label: 'Не пришёл', color: 'warning' },
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

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
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar sx={{ width: 80, height: 80, fontSize: 32, bgcolor: 'primary.main' }}>
            {displayName[0].toUpperCase()}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h5" fontWeight={700}>{displayName}</Typography>
            <Typography color="text.secondary">@{profile.login}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip label={ROLE_LABELS[profile.role]} color="primary" size="small" />
              <Chip label={profile.email} variant="outlined" size="small" />
            </Stack>
          </Box>
        </Stack>

        {profile.studentProfile && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
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
                    <ListItem
                      key={reg.id}
                      button
                      onClick={() => navigate(`/events/${reg.event.id}`)}
                      divider
                    >
                      <ListItemText
                        primary={reg.event.title}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarToday fontSize="inherit" />
                            <span>
                              {format(new Date(reg.event.startAt), 'd MMMM yyyy', { locale: ru })}
                            </span>
                            <span>• {reg.event.organizer.organizationName}</span>
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={REG_STATUS[reg.status]?.label ?? reg.status}
                          color={REG_STATUS[reg.status]?.color ?? 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
