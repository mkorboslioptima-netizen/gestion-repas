import { useAuth } from './AuthContext';

export function useRole(): string | null {
  const { roles } = useAuth();
  return roles[0] ?? null;
}

export function useIsRole(...allowed: string[]): boolean {
  const role = useRole();
  return role !== null && allowed.includes(role);
}
