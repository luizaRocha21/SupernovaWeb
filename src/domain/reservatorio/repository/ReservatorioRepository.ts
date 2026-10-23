import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';
import { ChecklistSanitarioModel, Reservatorio } from '../model/Reservatorio.js';
import { IReservatorioRepository } from './IReservatorioRepository.js';

const RESERVATORIOS_INICIAIS: Reservatorio[] = [
  {
    id: 1,
    apelido: 'Cisterna de Placas Principal (Casa)',
    tipo: TipoReservatorio.CISTERNA,
    responsavelId: 1,
    localidadeId: 1,
    capacidadeLitros: 16000,
    ultimoNivelPercentual: 68,
    escala: EscalaNivelReservatorio.MEDIO,
    profundidadeMetros: null,
    consentimentoAgregacao: true,
    alertaEstiagemAtivo: false,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 2,
    apelido: 'Cisterna Calçadão da Roça',
    tipo: TipoReservatorio.CISTERNA,
    responsavelId: 2,
    localidadeId: 2,
    capacidadeLitros: 52000,
    ultimoNivelPercentual: 22,
    escala: EscalaNivelReservatorio.CRITICO,
    profundidadeMetros: null,
    consentimentoAgregacao: true,
    alertaEstiagemAtivo: true,
    mensagemAlerta:
      'Alerta de Estiagem: nível abaixo de 25%. Priorize consumo humano e dessedentação animal.',
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 3,
    apelido: 'Poço Tubular Comunitário Achado',
    tipo: TipoReservatorio.POCO,
    responsavelId: 5,
    localidadeId: 3,
    capacidadeLitros: 40000,
    ultimoNivelPercentual: 75,
    escala: EscalaNivelReservatorio.CHEIO,
    profundidadeMetros: 48.5,
    consentimentoAgregacao: true,
    alertaEstiagemAtivo: false,
    atualizadoEm: new Date().toISOString()
  }
];

export class ReservatorioRepository implements IReservatorioRepository {
  private reservatorios: Reservatorio[] = [...RESERVATORIOS_INICIAIS];
  private checklists: ChecklistSanitarioModel[] = [];

  public listarTodos(localidadeId?: number): Reservatorio[] {
    if (localidadeId !== undefined && Number(localidadeId) > 0) {
      return this.reservatorios.filter((r) => r.localidadeId === Number(localidadeId));
    }
    return [...this.reservatorios];
  }

  public buscarPorId(id: number): Reservatorio | undefined {
    return this.reservatorios.find((r) => r.id === id);
  }

  public salvar(dados: Omit<Reservatorio, 'id'>): Reservatorio {
    const proximoId =
      this.reservatorios.reduce((maior, atual) => (atual.id > maior ? atual.id : maior), 0) + 1;
    const novo: Reservatorio = {
      ...dados,
      id: proximoId
    };
    this.reservatorios.push(novo);
    return novo;
  }

  public atualizar(id: number, dados: Partial<Reservatorio>): Reservatorio | undefined {
    const idx = this.reservatorios.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;

    const atualizado: Reservatorio = {
      ...this.reservatorios[idx],
      ...dados,
      id,
      atualizadoEm: new Date().toISOString()
    };
    this.reservatorios[idx] = atualizado;
    return atualizado;
  }

  public salvarChecklist(
    dados: Omit<ChecklistSanitarioModel, 'id' | 'criadoEm'>
  ): ChecklistSanitarioModel {
    const proximoId =
      this.checklists.reduce((maior, atual) => (atual.id > maior ? atual.id : maior), 0) + 1;
    const novo: ChecklistSanitarioModel = {
      ...dados,
      id: proximoId,
      criadoEm: new Date().toISOString()
    };
    this.checklists.push(novo);
    this.atualizar(dados.reservatorioId, { ultimoChecklist: novo });
    return novo;
  }
}

export const reservatorioRepository = new ReservatorioRepository();
