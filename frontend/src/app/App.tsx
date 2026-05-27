import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { router } from './router';
import { useAuthStore } from '../shared/store/auth.store';
import { authApi } from '../shared/api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main:  '#4F46E5',
      dark:  '#3730A3',
      light: '#818CF8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F97316',
      contrastText: '#FFFFFF',
    },
    error:   { main: '#EF4444' },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    background: {
      default: '#F8F7FF',
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#1E1B4B',
      secondary: '#6B7280',
      disabled:  '#BCC1CF',
    },
    divider: '#E9E7F9',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 3px rgba(30,27,75,.06)',
    '0 4px 12px rgba(30,27,75,.08)',
    '0 2px 8px rgba(30,27,75,.10)',
    '0 8px 24px rgba(30,27,75,.12)',
    '0 16px 40px rgba(30,27,75,.18)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@import': "url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')",
        body: { backgroundColor: '#F8F7FF' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
        containedPrimary: {
          boxShadow: '0 2px 6px rgba(79,70,229,.28)',
          '&:hover': {
            backgroundColor: '#3730A3',
            boxShadow: '0 4px 12px rgba(79,70,229,.35)',
          },
        },
        outlinedPrimary: {
          borderWidth: '2px',
          '&:hover': { borderWidth: '2px', backgroundColor: '#EEF2FF' },
        },
        sizeLarge:  { padding: '12px 24px', borderRadius: 12 },
        sizeMedium: { padding: '9px 20px' },
        sizeSmall:  { padding: '6px 14px', borderRadius: 8 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E9E7F9',
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(30,27,75,.07)',
          transition: 'box-shadow .2s ease, transform .2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(30,27,75,.13)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E9E7F9' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#818CF8' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4F46E5',
              boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E9E7F9' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#818CF8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4F46E5',
            boxShadow: '0 0 0 3px rgba(79,70,229,.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(30,27,75,.12)' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#E9E7F9' },
        bar:  { borderRadius: 4 },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { borderRadius: 12, backgroundColor: '#EEF2FF' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          '& .MuiPaginationItem-root': { borderRadius: 8 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#E9E7F9' },
      },
    },
  },
});

function AuthInitializer({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { refreshToken, accessToken, setTokens, logout } = useAuthStore();

  useEffect(() => {
    // Успешная загрузка приложения — сброс счётчика авто-перезагрузок chunk-ошибок
    sessionStorage.removeItem('__chunk_reloads__');

    if (refreshToken && !accessToken) {
      authApi.refresh(refreshToken)
        .then(({ data }) => {
          setTokens(data.accessToken, data.refreshToken);
        })
        .catch((err) => {
          // Только явный отказ сервера (невалидный токен) → разлогиниваем.
          // Сетевая ошибка (бэкенд ещё не поднялся) → оставляем токены, интерцептор разберётся.
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            logout();
          }
        })
        .finally(() => {
          setReady(true);
        });
    } else {
      setReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthInitializer>
          <RouterProvider router={router} />
        </AuthInitializer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
