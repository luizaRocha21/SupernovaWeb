import { SeveridadeAlerta } from '../enums/SeveridadeAlerta.js';
import { Comunicado } from '../model/Comunicado.js';
import { IComunidadeRepository } from './IComunidadeRepository.js';
import {
  firebaseClient,
  FIREBASE_COLLECTIONS
} from '../../../infrastructure/database/FirebaseClient.js';

const COMUNICADOS_INICIAIS: Comunicado[] = [
  {
    id: 1,
    localidadeId: 1,
    autorId: 3,
    autorNome: 'Defesa Civil / INMET Estação A424',
    tipo: 'ALERTA_CLIMATICO',
    categoria: 'DEFESA_CIVIL',
    municipio: 'Irecê',
    severidade: SeveridadeAlerta.ATENCAO,
    titulo: 'Vigilância de Umidade e Janela de Plantio no Território de Irecê',
    conteudo:
      'Mantenha o acompanhamento diário do pluviômetro e limpe calhas e bicas da cisterna antes das próximas pancadas previstas para a microrregião.',
    fonte: 'INMET A424 · Defesa Civil Municipal',
    publicadoEm: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    vigenteAte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    localidadeId: 1,
    autorId: 4,
    autorNome: 'Sindicato dos Trabalhadores Rurais',
    tipo: 'AVISO_MURAL',
    categoria: 'SEMENTES',
    municipio: 'Irecê',
    severidade: SeveridadeAlerta.INFO,
    titulo: 'Mutirão de Distribuição de Sementes Crioulas (Feijão-Caupi e Milho)',
    conteudo:
      'As famílias cadastradas podem retirar lotes de sementes adaptadas ao semiárido na sede do Sindicato e nas associações comunitárias de Irecê e Presidente Dutra.',
    fonte: 'Mural Comunitário STR',
    publicadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    vigenteAte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    localidadeId: 1,
    autorId: 5,
    autorNome: 'Associação Comunitária do Semiárido',
    tipo: 'AVISO_MURAL',
    categoria: 'MUTIRAO',
    municipio: 'Irecê',
    severidade: SeveridadeAlerta.INFO,
    titulo: 'Mutirão de Limpeza do Barreiro Comunitário',
    conteudo:
      'Neste sábado às 7h da manhã faremos a limpeza das valetas de entrada do barreiro e revisão das cercas de proteção.',
    fonte: 'Mural Comunitário STR',
    publicadoEm: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    vigenteAte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export class ComunidadeRepository implements IComunidadeRepository {
  private comunicados: Comunicado[] = [...COMUNICADOS_INICIAIS];

  constructor() {
    void this.inicializarFirebase();
  }

  private async inicializarFirebase(): Promise<void> {
    try {
      const remotos = await firebaseClient.listarColecao<Comunicado>(
        FIREBASE_COLLECTIONS.COMUNIDADE_AVISOS
      );
      if (remotos.length > 0) {
        const mapa = new Map<number, Comunicado>();
        for (const item of this.comunicados) {
          mapa.set(Number(item.id), item);
        }
        for (const item of remotos) {
          if (item && item.id !== undefined) {
            mapa.set(Number(item.id), {
              ...item,
              id: Number(item.id),
              localidadeId: Number(item.localidadeId) || 1,
              autorId: Number(item.autorId) || 1
            });
          }
        }
        this.comunicados = Array.from(mapa.values()).sort((a, b) =>
          String(b.publicadoEm || '').localeCompare(String(a.publicadoEm || ''))
        );
      } else {
        for (const inicial of this.comunicados) {
          await firebaseClient.salvarDocumento(
            FIREBASE_COLLECTIONS.COMUNIDADE_AVISOS,
            inicial.id,
            inicial
          );
        }
      }
    } catch {
      // Mantém espelho local caso o Firestore esteja indisponível
    }
  }

  public listarTodos(localidadeId?: number): Comunicado[] {
    const lista =
      localidadeId !== undefined && Number(localidadeId) > 0
        ? this.comunicados.filter((c) => c.localidadeId === Number(localidadeId))
        : [...this.comunicados];

    return lista.sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
  }

  public salvar(dados: Omit<Comunicado, 'id'>): Comunicado {
    const proximoId =
      this.comunicados.reduce((maior, atual) => (atual.id > maior ? atual.id : maior), 0) + 1;
    const novo: Comunicado = {
      ...dados,
      id: proximoId
    };
    this.comunicados.unshift(novo);
    void firebaseClient.salvarDocumento(
      FIREBASE_COLLECTIONS.COMUNIDADE_AVISOS,
      novo.id,
      novo
    );
    return novo;
  }
}

export const comunidadeRepository = new ComunidadeRepository();

