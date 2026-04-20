import type { ReactNode } from 'react';
import { useRole } from '../auth/useRole';

interface Props {
  allowed: string[];
  children: ReactNode;
}

export default function RoleGate({ allowed, children }: Props) {
  const role = useRole();
  if (!role || !allowed.includes(role)) return null;
  return <>{children}</>;
}
