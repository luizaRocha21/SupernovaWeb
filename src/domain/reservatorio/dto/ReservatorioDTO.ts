import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';
import {
  ChecklistSanitarioModel,
  LeituraNivelReservatorioModel
} from '../model/Reservatorio.js';

export interface CriarReservatorioRequestDTO {
  apelido: string;
  tipo?: TipoReservatorio;
  responsavelId?: number;
  localidadeId?: number;
  capacidadeLitros?: number;
  nivelPercentual?: number;
  profundidadeMetros?: number | null;
  consentimentoAgregacao?: boolean;
}

export interface AtualizarNivelReservatorioRequestDTO {
  nivelPercentual?: number;
  percentual?: number;
  volumeLitros?: number;
  volumeAtualLitros?: number;
  profundidadeMetros?: number | null;
  observacao?: string;
}

export interface RegistrarChecklistRequestDTO {
  protecaoEntrada: boolean;
  aguaSemOdorOuCor: boolean;
  entornoLimpo: boolean;
  estruturaIntegra: boolean;
  observacao?: string;
}

export interface ReservatorioResponseDTO {
  id: number;
  apelido: string;
  nome?: string;
  tipo: TipoReservatorio;
  responsavelId: number;
  localidadeId: number;
  capacidadeLitros: number;
  volumeEstimadoLitros: number;
  volumeAtualLitros?: number;
  ultimoNivelPercentual: number;
  escala: EscalaNivelReservatorio;
  profundidadeMetros?: number | null;
  consentimentoAgregacao: boolean;
  alertaEstiagemAtivo: boolean;
  mensagemAlerta?: string;
  ultimoChecklist?: ChecklistSanitarioModel;
  historicoLeituras?: LeituraNivelReservatorioModel[];
  atualizadoEm: string;
}
