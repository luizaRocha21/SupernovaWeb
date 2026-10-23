import { StatusAptidaoPlantio } from '../enums/StatusAptidaoPlantio.js';

export interface AvaliacaoCulturaDTO {
  culturaId: number;
  slug: string;
  nome: string;
  janelaDias: number;
  limiarPadraoMm: number;
  limiarAtivoMm: number;
  limiarPersonalizado: boolean;
  precipitacaoObservadaMm: number;
  percentualAtingido: number;
  statusAptidao: StatusAptidaoPlantio;
  recomendacao: string;
  fonteLimiar: string;
}

export interface DiagnosticoPlantioResponseDTO {
  localidadeId: number;
  precipitacaoReferenciaMm: number;
  statusGeral: StatusAptidaoPlantio;
  resumoConsultivo: string;
  avisoConsultivoRN12: string;
  culturas: AvaliacaoCulturaDTO[];
  atualizadoEm: string;
}
