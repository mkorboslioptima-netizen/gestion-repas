import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  requiredRole?: string;
}

export default function PrivateRoute({ children, requiredRole }: Props) {
  const { token, roles } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}
