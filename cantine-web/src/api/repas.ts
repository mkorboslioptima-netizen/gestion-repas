import apiClient from './axios';

export type RepasType = 'PlatChaud' | 'Sandwich';

export interface PassageDto {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  timestamp: string; // ISO date string
  repasType: RepasType;
  lecteurNom: string;
}

export interface RepasStatsDto {
  siteId: string;
  nomSite: string;
  totalPassages: number;
  platChaud: number;
  sandwich: number;
  quotaAtteint: number;
}

export interface FiltreParams {
  dateDebut?: string;
  dateFin?: string;
  heureDebut?: string;
  heureFin?: string;
}

export async function getStatsJour(params?: FiltreParams): Promise<RepasStatsDto[]> {
  const { data } = await apiClient.get<RepasStatsDto[]>('/api/repas/stats-jour', { params });
  return data;
}

export async function getHistoriqueJour(limit = 50, params?: FiltreParams): Promise<PassageDto[]> {
  const { data } = await apiClient.get<PassageDto[]>('/api/repas/historique-jour', {
    params: { limit, ...params },
  });
  return data;
}

export async function getExportExcel(params: FiltreParams): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/api/repas/export', {
    params,
    responseType: 'blob',
  });
  return data;
}
