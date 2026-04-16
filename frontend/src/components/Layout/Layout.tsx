import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, IconButton,
  Menu, MenuItem, Avatar, Chip,
} from '@mui/material';
import { EventNote, Person, AdminPanelSettings } from '@mui/icons-material';
import { useState } from 'react';
import { useAuthStore } from '../../shared/store/auth.store';
import { authApi } from '../../shared/api/client';

export default function Layout() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, refreshToken } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    logout();
    navigate('/events');
    setAnchorEl(null);
  };

  const roleLabel: Record<string, string> = {
    STUDENT: 'Студент',
    ORGANIZER: 'Организатор',
    ADMIN: 'Администратор',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <EventNote sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/events"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
          >
            СтудСобытия
          </Typography>

          <Button color="inherit" component={RouterLink} to="/events">
            Мероприятия
          </Button>

          {isAuthenticated && user ? (
            <>
              {user.role === 'ADMIN' && (
                <IconButton color="inherit" component={RouterLink} to="/admin" title="Админ панель">
                  <AdminPanelSettings />
                </IconButton>
              )}
              <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                  {user.login[0].toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem disabled>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{user.login}</Typography>
                    <Chip label={roleLabel[user.role] ?? user.role} size="small" color="primary" />
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }}>
                  <Person sx={{ mr: 1 }} fontSize="small" /> Профиль
                </MenuItem>
                {user.role === 'ORGANIZER' && (
                  <MenuItem onClick={() => { navigate('/my-events'); setAnchorEl(null); }}>
                    Мои мероприятия
                  </MenuItem>
                )}
                {user.role === 'ORGANIZER' && (
                  <MenuItem onClick={() => { navigate('/events/new'); setAnchorEl(null); }}>
                    Создать мероприятие
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  Выйти
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">Войти</Button>
              <Button
                variant="outlined"
                color="inherit"
                component={RouterLink}
                to="/register"
                sx={{ ml: 1 }}
              >
                Регистрация
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>

      <Box component="footer" sx={{ py: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © 2024 Платформа студенческих мероприятий
        </Typography>
      </Box>
    </Box>
  );
}
