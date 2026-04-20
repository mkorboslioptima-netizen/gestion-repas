import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  requiredRole?: string;
  allowed?: string[];
}

export default function PrivateRoute({ children, requiredRole, allowed }: Props) {
  const { token, roles } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/dashboard" replace />;
  if (allowed && !allowed.some(r => roles.includes(r))) return <Navigate to="/" replace />;

  return <>{children}</>;
}
