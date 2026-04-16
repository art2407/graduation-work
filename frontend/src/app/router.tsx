import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

const EventsPage = lazy(() => import('../pages/EventsPage/EventsPage'));
const EventDetailPage = lazy(() => import('../pages/EventDetailPage/EventDetailPage'));
const LoginPage = lazy(() => import('../pages/LoginPage/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage/RegisterPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage/ProfilePage'));
const AdminPage = lazy(() => import('../pages/AdminPage/AdminPage'));
const CreateEventPage = lazy(() => import('../pages/CreateEventPage/CreateEventPage'));
const OrganizerEventsPage = lazy(() => import('../pages/OrganizerEventsPage/OrganizerEventsPage'));

const Loader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
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
    path: '/register',
    element: <Suspense fallback={<Loader />}><RegisterPage /></Suspense>,
  },
]);
