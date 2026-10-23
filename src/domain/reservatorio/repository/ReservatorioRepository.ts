import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';
import { ChecklistSanitarioModel, Reservatorio } from '../model/Reservatorio.js';
import { IReservatorioRepository } from './IReservatorioRepository.js';
import {
  firebaseClient,
  FIREBASE_COLLECTIONS
} from '../../../infrastructure/database/FirebaseClient.js';

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
    historicoLeituras: [
      {
        data: new Date().toLocaleDateString('pt-BR'),
        volumeLitros: 10880,
        capacidadeLitros: 16000,
        percentual: 68,
        observacao: 'Reserva segura após chuva na propriedade'
      },
      {
        data: '12/10/2026',
        volumeLitros: 11200,
        capacidadeLitros: 16000,
        percentual: 70,
        observacao: 'Primeira água desviada corretamente'
      }
    ],
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
    historicoLeituras: [
      {
        data: new Date().toLocaleDateString('pt-BR'),
        volumeLitros: 11440,
        capacidadeLitros: 52000,
        percentual: 22,
        observacao: 'Economizar para criação e canteiro'
      }
    ],
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
    historicoLeituras: [
      {
        data: new Date().toLocaleDateString('pt-BR'),
        volumeLitros: 30000,
        capacidadeLitros: 40000,
        percentual: 75,
        observacao: 'Vazão normal no povoado'
      }
    ],
    atualizadoEm: new Date().toISOString()
  }
];

export class ReservatorioRepository implements IReservatorioRepository {
  private reservatorios: Reservatorio[] = [...RESERVATORIOS_INICIAIS];
  private checklists: ChecklistSanitarioModel[] = [];

  constructor() {
    void this.inicializarFirebase();
  }

  private async inicializarFirebase(): Promise<void> {
    try {
      const nuvem = await firebaseClient.listarColecao<Reservatorio>(
        FIREBASE_COLLECTIONS.RESERVATORIOS
      );

      if (nuvem && nuvem.length > 0) {
        const mapa = new Map<number, Reservatorio>();
        for (const r of this.reservatorios) {
          mapa.set(Number(r.id), r);
        }
        for (const rNuvem of nuvem) {
          if (!rNuvem || !rNuvem.id) continue;
          const idNum = Number(rNuvem.id);
          mapa.set(idNum, {
            ...rNuvem,
            id: idNum,
            capacidadeLitros: Number(rNuvem.capacidadeLitros) || 16000,
            ultimoNivelPercentual: Number(rNuvem.ultimoNivelPercentual) || 50,
            historicoLeituras: Array.isArray(rNuvem.historicoLeituras)
              ? rNuvem.historicoLeituras
              : []
          });
        }
        this.reservatorios = Array.from(mapa.values()).sort((a, b) => a.id - b.id);
      }

      for (const res of this.reservatorios) {
        await firebaseClient.salvarDocumento(
          FIREBASE_COLLECTIONS.RESERVATORIOS,
          String(res.id),
          res as unknown as Record<string, unknown>
        );
      }
    } catch (erro) {
      console.warn(
        '[ReservatorioRepository] Falha ao sincronizar reservatórios com Firebase:',
        erro instanceof Error ? erro.message : String(erro)
      );
    }
  }

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
    void firebaseClient.salvarDocumento(
      FIREBASE_COLLECTIONS.RESERVATORIOS,
      String(novo.id),
      novo as unknown as Record<string, unknown>
    );
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
    void firebaseClient.salvarDocumento(
      FIREBASE_COLLECTIONS.RESERVATORIOS,
      String(atualizado.id),
      atualizado as unknown as Record<string, unknown>
    );
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
