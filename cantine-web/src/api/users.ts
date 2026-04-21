import api from './axios';

export interface RecapMensuelRow {
  date: string;
  platsChauds: number;
  sandwichs: number;
  total: number;
}

export const getRecapMensuel = (annee: number, mois: number) =>
  api.get<RecapMensuelRow[]>(`/api/rapports/prestataire/mensuel?annee=${annee}&mois=${mois}`).then(r => r.data);

export interface AppUser {
  id: number;
  email: string;
  nom: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  siteId: string | null;
  siteNom: string | null;
  lastLoginAt: string | null;
}

export interface AuditLog {
  id: number;
  actorEmail: string;
  action: string;
  targetEmail: string;
  timestamp: string;
  details: string | null;
}

export const getUsers = () => api.get<AppUser[]>('/api/auth/users').then(r => r.data);

export const getAuditLog = () => api.get<AuditLog[]>('/api/auth/users/audit-log').then(r => r.data);

export const createUser = (data: { email: string; password: string; nom: string; role: string; siteId?: string }) =>
  api.post<AppUser>('/api/auth/users', data).then(r => r.data);

export const updateUser = (id: number, data: { role?: string; isActive?: boolean; siteId?: string }) =>
  api.put(`/api/auth/users/${id}`, data);

export const resetPassword = (id: number, newPassword: string) =>
  api.post(`/api/auth/users/${id}/reset-password`, { newPassword });
