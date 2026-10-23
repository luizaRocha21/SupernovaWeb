import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';
import { ChecklistSanitarioModel } from '../model/Reservatorio.js';

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
  nivelPercentual: number;
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
  tipo: TipoReservatorio;
  responsavelId: number;
  localidadeId: number;
  capacidadeLitros: number;
  volumeEstimadoLitros: number;
  ultimoNivelPercentual: number;
  escala: EscalaNivelReservatorio;
  profundidadeMetros?: number | null;
  consentimentoAgregacao: boolean;
  alertaEstiagemAtivo: boolean;
  mensagemAlerta?: string;
  ultimoChecklist?: ChecklistSanitarioModel;
  atualizadoEm: string;
}
