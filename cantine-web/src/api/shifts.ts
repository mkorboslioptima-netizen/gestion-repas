import apiClient from './axios';

export interface ShiftDto {
  id: number;
  nom: string;
  heureDebut: string;
  heureFin: string;
  actif: boolean;
  enCours: boolean;
}

export interface UpdateShiftDto {
  heureDebut: string;
  heureFin: string;
  actif: boolean;
}

export async function getShifts(): Promise<ShiftDto[]> {
  const { data } = await apiClient.get<ShiftDto[]>('/api/shifts');
  return data;
}

export async function getCurrentShift(): Promise<ShiftDto | null> {
  const { data } = await apiClient.get<ShiftDto | null>('/api/shifts/current');
  return data;
}

export async function updateShift(id: number, dto: UpdateShiftDto): Promise<ShiftDto> {
  const { data } = await apiClient.put<ShiftDto>(`/api/shifts/${id}`, dto);
  return data;
}
