import apiClient from './axios';

export interface EquipmentStatusDto {
  id: string;
  nom: string;
  adresseIP: string;
  type: 'lecteur' | 'imprimante';
  connecte: boolean;
  dernierCheck: string;
}

export async function getSupervisionStatus(): Promise<EquipmentStatusDto[]> {
  const { data } = await apiClient.get<EquipmentStatusDto[]>('/api/supervision/status');
  return data;
}

export async function checkLecteur(lecteurId: number): Promise<{
  lecteur: EquipmentStatusDto;
  imprimante?: EquipmentStatusDto;
}> {
  const { data } = await apiClient.post(`/api/supervision/check/${lecteurId}`);
  return data;
}
