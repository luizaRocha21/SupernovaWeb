import { RegistroChuva } from '../model/RegistroChuva.js';
import { IPluviometroRepository } from './IPluviometroRepository.js';

function diasAtrasIso(dias: number): string {
  const data = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return data.toISOString().slice(0, 10);
}

const REGISTROS_INICIAIS: RegistroChuva[] = [
  {
    id: 1,
    localidadeId: 1,
    usuarioId: 1,
    volumeMm: 18.5,
    dataEvento: diasAtrasIso(2),
    fonte: 'PLUVIOMETRO_PROPRIO',
    observacao: 'Chuva de fim de tarde no pluviômetro da propriedade em Irecê',
    criadoEm: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    localidadeId: 1,
    usuarioId: 1,
    volumeMm: 21.5,
    dataEvento: diasAtrasIso(8),
    fonte: 'PLUVIOMETRO_PROPRIO',
    observacao: 'Pancada bem distribuída na roça',
    criadoEm: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    localidadeId: 2,
    usuarioId: 2,
    volumeMm: 16.0,
    dataEvento: diasAtrasIso(4),
    fonte: 'PLUVIOMETRO_PROPRIO',
    observacao: 'Registro de chuva em Presidente Dutra',
    criadoEm: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    localidadeId: 3,
    usuarioId: 5,
    volumeMm: 24.0,
    dataEvento: diasAtrasIso(5),
    fonte: 'PLUVIOMETRO_PROPRIO',
    observacao: 'Chuva medida no Povoado de Achado',
    criadoEm: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export class PluviometroRepository implements IPluviometroRepository {
  private registros: RegistroChuva[] = [...REGISTROS_INICIAIS];

  public listarPorLocalidade(localidadeId: number): RegistroChuva[] {
    return this.registros
      .filter((r) => r.localidadeId === localidadeId)
      .sort((a, b) => b.dataEvento.localeCompare(a.dataEvento));
  }

  public listarPorUsuario(usuarioId: number): RegistroChuva[] {
    return this.registros
      .filter((r) => r.usuarioId === usuarioId)
      .sort((a, b) => b.dataEvento.localeCompare(a.dataEvento));
  }

  public salvar(dados: Omit<RegistroChuva, 'id' | 'criadoEm'>): RegistroChuva {
    if (dados.idClienteSync) {
      const jaSincronizado = this.registros.find((r) => r.idClienteSync === dados.idClienteSync);
      if (jaSincronizado) {
        return jaSincronizado;
      }
    }

    const proximoId =
      this.registros.reduce((maior, atual) => (atual.id > maior ? atual.id : maior), 0) + 1;

    const novo: RegistroChuva = {
      ...dados,
      id: proximoId,
      criadoEm: new Date().toISOString()
    };
    this.registros.push(novo);
    return novo;
  }

  public calcularAcumuladoJanelaDias(localidadeId: number, janelaDias: number): number {
    const limiteMs = Date.now() - janelaDias * 24 * 60 * 60 * 1000;
    const soma = this.registros
      .filter((r) => {
        if (r.localidadeId !== localidadeId) return false;
        const ts = Date.parse(r.dataEvento);
        return !Number.isNaN(ts) && ts >= limiteMs;
      })
      .reduce((acc, item) => acc + item.volumeMm, 0);

    return Number(soma.toFixed(1));
  }

  public calcularAcumuladoMesAtual(localidadeId: number): number {
    const agora = new Date();
    const prefixoMes = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}`;
    const soma = this.registros
      .filter((r) => r.localidadeId === localidadeId && r.dataEvento.startsWith(prefixoMes))
      .reduce((acc, item) => acc + item.volumeMm, 0);

    // Se o cruzamento de virada de mês deixar 0, considera os últimos 30 dias registrados na localidade
    if (soma === 0) {
      return this.calcularAcumuladoJanelaDias(localidadeId, 30);
    }

    return Number(soma.toFixed(1));
  }
}

export const pluviometroRepository = new PluviometroRepository();
