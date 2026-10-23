import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';

export interface ChecklistSanitarioModel {
  id: number;
  reservatorioId: number;
  dataAvaliacao: string;
  protecaoEntrada: boolean;
  aguaSemOdorOuCor: boolean;
  entornoLimpo: boolean;
  estruturaIntegra: boolean;
  riscoPotabilidade: boolean;
  observacao: string;
  criadoEm: string;
}

export interface Reservatorio {
  id: number;
  apelido: string;
  tipo: TipoReservatorio;
  responsavelId: number;
  localidadeId: number;
  capacidadeLitros: number;
  ultimoNivelPercentual: number;
  escala: EscalaNivelReservatorio;
  profundidadeMetros?: number | null;
  consentimentoAgregacao: boolean;
  alertaEstiagemAtivo: boolean;
  mensagemAlerta?: string;
  ultimoChecklist?: ChecklistSanitarioModel;
  atualizadoEm: string;
}
