import apiClient from './axios';

export interface SiteDto {
  siteId: string;
  nom: string;
  actif: boolean;
}

export interface MorphoConfigDto {
  siteId: string;
  connectionString: string;
  query: string;
  commandTimeout: number;
}

export async function getSites(): Promise<SiteDto[]> {
  const { data } = await apiClient.get<SiteDto[]>('/api/sites');
  return data;
}

export async function getMorphoConfig(siteId: string): Promise<MorphoConfigDto> {
  const { data } = await apiClient.get<MorphoConfigDto>(`/api/sites/${siteId}/morpho-config`);
  return data;
}

export async function updateMorphoConfig(siteId: string, payload: MorphoConfigDto): Promise<MorphoConfigDto> {
  const { data } = await apiClient.put<MorphoConfigDto>(`/api/sites/${siteId}/morpho-config`, payload);
  return data;
}
