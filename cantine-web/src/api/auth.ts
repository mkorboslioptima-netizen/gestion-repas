import apiClient from './axios';

export interface LoginResult {
  token: string;
  nom: string;
  role: string;
  siteId?: string | null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/api/auth/login', { email, password });
  return data;
}
