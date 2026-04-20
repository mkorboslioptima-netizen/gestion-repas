import apiClient from './axios';

export interface SiteDto {
  siteId: string;
  nom: string;
  actif: boolean;
  employeCount: number;
}

export interface CreateSiteDto {
  siteId: string;
  nom: string;
}

export interface UpdateSiteDto {
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

export async function createSite(dto: CreateSiteDto): Promise<SiteDto> {
  const { data } = await apiClient.post<SiteDto>('/api/sites', dto);
  return data;
}

export async function updateSite(siteId: string, dto: UpdateSiteDto): Promise<SiteDto> {
  const { data } = await apiClient.put<SiteDto>(`/api/sites/${siteId}`, dto);
  return data;
}

export async function deleteSite(siteId: string): Promise<void> {
  await apiClient.delete(`/api/sites/${siteId}`);
}

export interface SyncResultDto {
  importes: number;
  misAJour: number;
  desactives: number;
  ignores: number;
  employeCount: number;
}

export async function syncSiteEmployees(siteId: string): Promise<SyncResultDto> {
  const { data } = await apiClient.post<SyncResultDto>(`/api/sites/${siteId}/sync`);
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
