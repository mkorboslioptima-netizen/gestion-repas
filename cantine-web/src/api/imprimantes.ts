import apiClient from './axios';

export interface ImprimanteDto {
  lecteurId: number;
  nomLecteur: string;
  siteId: string;
  nomImprimante: string | null;
  printerIP: string | null;
  portImprimante: number;
  configuree: boolean;
}

export interface UpdateImprimanteDto {
  nomImprimante: string | null;
  printerIP: string | null;
  portImprimante: number;
}

export interface TestImprimanteResultDto {
  succes: boolean;
  message: string;
  latenceMs: number | null;
}

export async function fetchImprimantes(): Promise<ImprimanteDto[]> {
  const { data } = await apiClient.get<ImprimanteDto[]>('/api/imprimantes');
  return data;
}

export async function updateImprimante(lecteurId: number, dto: UpdateImprimanteDto): Promise<ImprimanteDto> {
  const { data } = await apiClient.put<ImprimanteDto>(`/api/imprimantes/${lecteurId}`, dto);
  return data;
}

export async function testImprimante(lecteurId: number): Promise<TestImprimanteResultDto> {
  const { data } = await apiClient.post<TestImprimanteResultDto>(`/api/imprimantes/${lecteurId}/test`);
  return data;
}
