import apiClient from './axios';

export interface ImportResultDto {
  importes: number;
  misAJour: number;
  desactives: number;
  ignores: number;
}

export interface EmployeeDto {
  matricule: string;
  nom: string;
  prenom: string;
  actif: boolean;
  maxMealsPerDay: number;
}

export interface SyncLogDto {
  id: number;
  siteId: string;
  nomSite: string;
  occurredAt: string; // ISO date string
  source: 'Manual' | 'Auto';
  importes: number;
  misAJour: number;
  desactives: number;
  ignores: number;
}

export interface EmployeeSiteStatsDto {
  siteId: string;
  nomSite: string;
  totalActifs: number;
  derniereSynchro: SyncLogDto | null;
}

export async function importDepuisMorpho(siteId: string): Promise<ImportResultDto> {
  const { data } = await apiClient.post<ImportResultDto>(`/api/employes/import-morpho/${siteId}`);
  return data;
}

export async function syncMorpho(): Promise<void> {
  await apiClient.post('/api/employes/sync-morpho');
}

export async function getEmployes(siteId: string): Promise<EmployeeDto[]> {
  const { data } = await apiClient.get<EmployeeDto[]>('/api/employes', { params: { siteId } });
  return data;
}

export async function getEmployeStats(): Promise<EmployeeSiteStatsDto[]> {
  const { data } = await apiClient.get<EmployeeSiteStatsDto[]>('/api/employes/stats');
  return data;
}

export interface ExportEmployesParams {
  search?: string;
  actif?: boolean;
  maxMealsPerDay?: number;
}

export async function getExportEmployes(siteId: string, filtres?: ExportEmployesParams): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/api/employes/export', {
    params: { siteId, ...filtres },
    responseType: 'blob',
  });
  return data;
}
