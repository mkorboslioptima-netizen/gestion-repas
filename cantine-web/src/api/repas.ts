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

export async function getStatsJour(): Promise<RepasStatsDto[]> {
  const { data } = await apiClient.get<RepasStatsDto[]>('/api/repas/stats-jour');
  return data;
}

export async function getHistoriqueJour(limit = 50): Promise<PassageDto[]> {
  const { data } = await apiClient.get<PassageDto[]>('/api/repas/historique-jour', {
    params: { limit },
  });
  return data;
}
