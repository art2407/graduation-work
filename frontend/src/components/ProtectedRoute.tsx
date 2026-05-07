import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../shared/store/auth.store';
import { UserRole } from '../shared/types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/events" replace />;

  return <>{children}</>;
}
