import apiClient from './axios';

export interface LecteurDto {
  id: number;
  nom: string;
  adresseIP: string;
  actif: boolean;
  nomImprimante: string | null;
  printerIP: string | null;
  portImprimante: number;
  imprimanteConfiguree: boolean;
}

export interface CreateLecteurDto {
  nom: string;
  adresseIP: string;
}

export interface UpdateLecteurDto {
  nom: string;
  adresseIP: string;
  actif: boolean;
  nomImprimante?: string | null;
  printerIP?: string | null;
  portImprimante?: number;
}

export const fetchLecteurs = async (): Promise<LecteurDto[]> => {
  const { data } = await apiClient.get<LecteurDto[]>('/api/lecteurs');
  return data;
};

export const createLecteur = async (dto: CreateLecteurDto): Promise<LecteurDto> => {
  const { data } = await apiClient.post<LecteurDto>('/api/lecteurs', dto);
  return data;
};

export const updateLecteur = async (id: number, dto: UpdateLecteurDto): Promise<LecteurDto> => {
  const { data } = await apiClient.put<LecteurDto>(`/api/lecteurs/${id}`, dto);
  return data;
};

export const deleteLecteur = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/lecteurs/${id}`);
};
