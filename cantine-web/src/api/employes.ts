import apiClient from './axios';

export interface ImportResultDto {
  importes: number;
  misAJour: number;
  ignores: number;
}

export async function importDepuisMorpho(siteId: string): Promise<ImportResultDto> {
  const { data } = await apiClient.post<ImportResultDto>(`/api/employes/import-morpho/${siteId}`);
  return data;
}

export async function syncMorpho(): Promise<void> {
  await apiClient.post('/api/employes/sync-morpho');
}
