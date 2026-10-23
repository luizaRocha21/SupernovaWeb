import { DiagnosticoPlantioResponseDTO } from '../../plantio/dto/DiagnosticoPlantioResponseDTO.js';
import { AlertaRadarResponseDTO } from './AlertaRadarResponseDTO.js';

export interface DiagnosticoClimaResponseDTO {
  localidade: {
    id: number;
    nome: string;
    municipio: string;
    uf: string;
    codigoIbge?: string;
    latitude: number;
    longitude: number;
    estacaoInmetCodigo: string;
  };
  meteorologiaAtual: {
    temperaturaC: number;
    umidadeRelativaPct: number;
    precipitacaoAtualMm: number;
    ventoVelocidadeKmh: number;
    fonteTelemetria: string;
  };
  chuvaAcumulada: {
    acumuladoMesMm: number;
    acumuladoUltimos30DiasMm: number;
    acumuladoUltimos7DiasMm: number;
    acumuladoPluviometroProprioMm: number;
    acumuladoOpenMeteo30DiasMm: number;
    previsaoProximos7DiasMm: number;
    normalClimatologicaMesMm: number;
    percentualDaNormal: number;
    fraseComparativa: string;
  };
  plantio: DiagnosticoPlantioResponseDTO;
  alertasRadar?: AlertaRadarResponseDTO[];
  fonteAlertas?: string;
  // Campos planos adicionais para retrocompatibilidade direta com painéis de telemetria
  municipio?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  temperaturaAtualC?: number;
  umidadeRelativaPct?: number;
  chuvaAcumulada30dMm?: number;
  chuvaUltimos7dMm?: number;
  alertaSeca?: boolean;
  fonteDados?: string;
  recomendacoesPlantio?: Array<{
    cultura: string;
    chuvaAcumuladaMm: number;
    limiarExigidoMm: number;
    janelaDias: number | null;
    status: string;
    orientacaoManejo: string;
  }>;
  atualizadoEm: string;
}
