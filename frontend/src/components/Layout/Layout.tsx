import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, Container,
  Menu, MenuItem, Avatar, Paper, BottomNavigation, BottomNavigationAction, Divider,
} from '@mui/material';
import {
  EventNote, Person, AdminPanelSettings, QrCodeScanner, School,
  EventAvailable, Add, Logout, KeyboardArrowDown,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuthStore } from '../../shared/store/auth.store';
import { authApi } from '../../shared/api/client';

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  STUDENT:   { label: 'Студент',           color: '#065F46', bg: '#D1FAE5' },
  ORGANIZER: { label: 'Организатор',       color: '#4338CA', bg: '#EEF2FF' },
  ADMIN:     { label: 'Администратор',     color: '#991B1B', bg: '#FEE2E2' },
  DEAN:      { label: 'Администрация вуза', color: '#92400E', bg: '#FEF3C7' },
};

// Инициалы из login
function initials(login: string) {
  return login.slice(0, 2).toUpperCase();
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, refreshToken } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    logout();
    navigate('/events');
    setAnchorEl(null);
  };

  const go = (path: string) => { navigate(path); setAnchorEl(null); };

  const bottomNavValue = (() => {
    const p = location.pathname;
    if (p.startsWith('/profile'))    return 'profile';
    if (p.startsWith('/admin'))      return 'admin';
    if (p.startsWith('/university')) return 'university';
    if (p.startsWith('/my-events'))  return 'my-events';
    return 'events';
  })();

  const roleMeta = user ? (ROLE_META[user.role] ?? { label: user.role, color: '#374151', bg: '#F3F4F6' }) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── AppBar ── */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar sx={{ gap: 0.5 }}>

          {/* Лого */}
          <EventNote sx={{ mr: 0.75, opacity: 0.9 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/events"
            noWrap
            sx={{
              flexGrow: 1, minWidth: 0,
              color: 'inherit', textDecoration: 'none',
              fontWeight: 800, letterSpacing: '-0.3px',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            СтудСобытия
          </Typography>

          {/* Десктоп-навигация */}
          <Button
            color="inherit"
            component={RouterLink}
            to="/events"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, opacity: 0.9, fontWeight: 500 }}
          >
            Мероприятия
          </Button>

          {isAuthenticated && user ? (
            <>
              {/* Кнопка создать — только для Organizer на десктопе */}
              {user.role === 'ORGANIZER' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  component={RouterLink}
                  to="/events/new"
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: 'white', borderColor: 'rgba(255,255,255,.5)',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.1)' },
                    mr: 0.5,
                  }}
                >
                  Создать
                </Button>
              )}

              {/* Аватар + дропдаун */}
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  ml: 0.5, cursor: 'pointer', borderRadius: '20px',
                  px: 1, py: 0.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,.12)' },
                  transition: 'background .15s',
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 12, fontWeight: 700 }}>
                  {initials(user.login)}
                </Avatar>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: 'white', fontWeight: 600 }}>
                  {user.login}
                </Typography>
                <KeyboardArrowDown sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 18, color: 'rgba(255,255,255,.7)' }} />
              </Box>

              {/* Дропдаун-меню */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1, minWidth: 220, borderRadius: '14px',
                      border: '1px solid #E9E7F9',
                      boxShadow: '0 8px 24px rgba(30,27,75,.14)',
                      overflow: 'hidden',
                    },
                  },
                }}
              >
                {/* Шапка меню */}
                <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8F7FF' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light', fontWeight: 700 }}>
                      {initials(user.login)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" color="text.primary">{user.login}</Typography>
                      {roleMeta && (
                        <Box sx={{
                          display: 'inline-block', mt: 0.25,
                          bgcolor: roleMeta.bg, color: roleMeta.color,
                          fontSize: '0.68rem', fontWeight: 700,
                          px: 1, py: 0.25, borderRadius: '6px',
                        }}>
                          {roleMeta.label}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: '#E9E7F9' }} />

                <MenuItem onClick={() => go('/events')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                  <EventNote fontSize="small" sx={{ color: 'primary.main' }} /> Мероприятия
                </MenuItem>
                <MenuItem onClick={() => go('/profile')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                  <Person fontSize="small" sx={{ color: 'primary.main' }} /> Профиль
                </MenuItem>

                {user.role === 'ORGANIZER' && <>
                  <MenuItem onClick={() => go('/my-events')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                    <EventAvailable fontSize="small" sx={{ color: 'primary.main' }} /> Мои мероприятия
                  </MenuItem>
                  <MenuItem onClick={() => go('/events/new')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                    <Add fontSize="small" sx={{ color: 'primary.main' }} /> Создать мероприятие
                  </MenuItem>
                  <MenuItem onClick={() => go('/scan')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                    <QrCodeScanner fontSize="small" sx={{ color: 'primary.main' }} /> Сканер QR
                  </MenuItem>
                </>}

                {(user.role === 'DEAN' || user.role === 'ADMIN') && (
                  <MenuItem onClick={() => go('/university')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                    <School fontSize="small" sx={{ color: 'primary.main' }} /> Кабинет администрации
                  </MenuItem>
                )}
                {user.role === 'ADMIN' && (
                  <MenuItem onClick={() => go('/admin')} sx={{ gap: 1.5, py: 1.25, color: 'text.primary' }}>
                    <AdminPanelSettings fontSize="small" sx={{ color: 'primary.main' }} /> Панель администратора
                  </MenuItem>
                )}

                <Divider sx={{ borderColor: '#E9E7F9' }} />
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}>
                  <Logout fontSize="small" /> Выйти
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{ fontWeight: 500, opacity: 0.9 }}
              >
                Войти
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                component={RouterLink}
                to="/register"
                sx={{
                  borderColor: 'rgba(255,255,255,.5)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.1)' },
                }}
              >
                Регистрация
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Main content ── */}
      <Box component="main" sx={{ flexGrow: 1, py: 3, pb: { xs: 10, sm: 3 } }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>

      {/* ── Footer (только десктоп) ── */}
      <Box
        component="footer"
        sx={{
          py: 2.5,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 СтудСобытия — Платформа студенческих мероприятий МИРЭА
        </Typography>
      </Box>

      {/* ── Mobile Bottom Navigation ── */}
      <Paper
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: { xs: 'block', sm: 'none' },
          zIndex: 1200, borderRadius: 0,
          borderTop: '1px solid #E9E7F9',
        }}
        elevation={0}
      >
        <BottomNavigation
          value={bottomNavValue}
          showLabels
          sx={{
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontWeight: 600,
              '&.Mui-selected': { fontSize: '0.65rem' },
            },
          }}
        >
          <BottomNavigationAction
            label="События"
            value="events"
            icon={<EventNote />}
            onClick={() => navigate('/events')}
          />
          {user?.role === 'ORGANIZER' && (
            <BottomNavigationAction
              label="Мои"
              value="my-events"
              icon={<EventAvailable />}
              onClick={() => navigate('/my-events')}
            />
          )}
          {user?.role === 'ADMIN' && (
            <BottomNavigationAction
              label="Панель"
              value="admin"
              icon={<AdminPanelSettings />}
              onClick={() => navigate('/admin')}
            />
          )}
          {(user?.role === 'DEAN' || user?.role === 'ADMIN') && (
            <BottomNavigationAction
              label="Кабинет"
              value="university"
              icon={<School />}
              onClick={() => navigate('/university')}
            />
          )}
          {isAuthenticated ? (
            <BottomNavigationAction
              label="Профиль"
              value="profile"
              icon={<Person />}
              onClick={() => navigate('/profile')}
            />
          ) : (
            <BottomNavigationAction
              label="Войти"
              value="login"
              icon={<Person />}
              onClick={() => navigate('/login')}
            />
          )}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
