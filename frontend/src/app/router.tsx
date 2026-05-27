import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import { CircularProgress, Box, Button, Typography } from '@mui/material';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

const RELOAD_COUNT_KEY = '__chunk_reloads__';

function isChunkLoadError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

function safeReload() {
  const count = parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0', 10);
  if (count >= 2) return; // не больше 2 авто-перезагрузок подряд
  sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1));
  // Небольшая задержка чтобы Vite успел завершить HMR перед перезагрузкой
  setTimeout(() => window.location.reload(), 250);
}

function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (isChunkLoadError(err)) {
        safeReload();
        return new Promise<never>(() => {});
      }
      throw err;
    }),
  );
}

const EventsPage = lazyWithReload(() => import('../pages/EventsPage/EventsPage'));
const EventDetailPage = lazyWithReload(() => import('../pages/EventDetailPage/EventDetailPage'));
const LoginPage = lazyWithReload(() => import('../pages/LoginPage/LoginPage'));
const RegisterPage = lazyWithReload(() => import('../pages/RegisterPage/RegisterPage'));
const ProfilePage = lazyWithReload(() => import('../pages/ProfilePage/ProfilePage'));
const AdminPage = lazyWithReload(() => import('../pages/AdminPage/AdminPage'));
const CreateEventPage = lazyWithReload(() => import('../pages/CreateEventPage/CreateEventPage'));
const OrganizerEventsPage = lazyWithReload(() => import('../pages/OrganizerEventsPage/OrganizerEventsPage'));
const QrScannerPage = lazyWithReload(() => import('../pages/QrScannerPage/QrScannerPage'));
const UniversityPage = lazyWithReload(() => import('../pages/UniversityPage/UniversityPage'));
const EditEventPage = lazyWithReload(() => import('../pages/EditEventPage/EditEventPage'));
const NotFoundPage = lazyWithReload(() => import('../pages/NotFoundPage/NotFoundPage'));

const Loader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

function RouteErrorBoundary() {
  const error = useRouteError() as unknown;

  if (isChunkLoadError(error)) {
    safeReload();
    return <Loader />;
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" gap={2}>
      <Typography variant="h6" color="text.secondary">Что-то пошло не так</Typography>
      <Button variant="contained" onClick={() => window.location.reload()}>
        Обновить страницу
      </Button>
    </Box>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/events" replace /> },
      {
        path: 'events',
        element: <Suspense fallback={<Loader />}><EventsPage /></Suspense>,
      },
      {
        path: 'events/new',
        element: (
          <ProtectedRoute roles={['ORGANIZER']}>
            <Suspense fallback={<Loader />}><CreateEventPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'events/:id',
        element: <Suspense fallback={<Loader />}><EventDetailPage /></Suspense>,
      },
      {
        path: 'events/:id/edit',
        element: (
          <ProtectedRoute roles={['ORGANIZER']}>
            <Suspense fallback={<Loader />}><EditEventPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loader />}><ProfilePage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-events',
        element: (
          <ProtectedRoute roles={['ORGANIZER']}>
            <Suspense fallback={<Loader />}><OrganizerEventsPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'scan',
        element: (
          <ProtectedRoute roles={['ORGANIZER']}>
            <Suspense fallback={<Loader />}><QrScannerPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'university',
        element: (
          <ProtectedRoute roles={['DEAN', 'ADMIN']}>
            <Suspense fallback={<Loader />}><UniversityPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <Suspense fallback={<Loader />}><AdminPage /></Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <Suspense fallback={<Loader />}><LoginPage /></Suspense>,
  },
  {
    path: '*',
    element: <Suspense fallback={<Loader />}><NotFoundPage /></Suspense>,
  },
  {
    path: '/register',
    element: <Suspense fallback={<Loader />}><RegisterPage /></Suspense>,
  },
]);
