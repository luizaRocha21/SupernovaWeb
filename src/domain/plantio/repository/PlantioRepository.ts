import { Cultura } from '../model/Cultura.js';
import { IPlantioRepository } from './IPlantioRepository.js';

const CULTURAS_CAATINGA: Cultura[] = [
  {
    id: 1,
    slug: 'milho',
    nome: 'Milho',
    janelaDias: 30,
    limiarPadraoMm: 120.0,
    fonteLimiar: 'Embrapa Semiárido / ZARC Bahia (120 mm em janela de 30 dias)',
    orientacaoFavoravel:
      'Umidade de solo favorável para semeadura de milho em sequeiro. Priorize plantio em contorno e cobertura morta.',
    orientacaoAtencao:
      'Umidade intermediária para o milho. Aguarde nova chuva acima de 15 mm ou utilize variedades superprecoces.',
    orientacaoInapto:
      'Volume acumulado insuficiente para o milho (alto risco de veranico na floração). Evite semear agora.'
  },
  {
    id: 2,
    slug: 'feijao-caupi',
    nome: 'Feijão-Caupi',
    janelaDias: 20,
    limiarPadraoMm: 110.0,
    fonteLimiar: 'Embrapa Semiárido — Ciclo curto no Território de Irecê (110 mm em janela de 20 dias)',
    orientacaoFavoravel:
      'Condição favorável para plantio de feijão-caupi. Aproveite a umidade superficial para garantir boa germinação.',
    orientacaoAtencao:
      'Janela em transição para feijão-caupi. Recomenda-se sulcamento ou barraginhas para reter a água na linha.',
    orientacaoInapto:
      'Estiagem ativa para feijão-caupi. Aguarde reposição hídrica antes de abrir covas.'
  },
  {
    id: 3,
    slug: 'mamona',
    nome: 'Mamona',
    janelaDias: 25,
    limiarPadraoMm: 90.0,
    fonteLimiar: 'Referência Agroclimática Irecê e Presidente Dutra — Tolerante à seca (90 mm em janela de 25 dias)',
    orientacaoFavoravel:
      'Excelente aptidão hídrica para a mamona. Cultura rústica bem adaptada ao volume acumulado atual.',
    orientacaoAtencao:
      'Volume próximo ao limiar da mamona. Caso o solo já tenha umidade a 15 cm de profundidade, o plantio é viável com cautela.',
    orientacaoInapto:
      'Volume abaixo do mínimo de segurança até para a mamona. Mantenha o solo protegido e aguarde as próximas chuvas.'
  }
];

export class PlantioRepository implements IPlantioRepository {
  private readonly culturas: Cultura[] = [...CULTURAS_CAATINGA];
  private readonly limiaresPersonalizados = new Map<string, number>();

  public listarCulturas(): Cultura[] {
    return [...this.culturas];
  }

  public buscarCulturaPorId(id: number): Cultura | undefined {
    return this.culturas.find((c) => c.id === id);
  }

  public obterLimiarAtivo(
    culturaId: number,
    usuarioId = 1
  ): { limiarMm: number; personalizado: boolean } {
    const cultura = this.buscarCulturaPorId(culturaId);
    const padrao = cultura ? cultura.limiarPadraoMm : 100;
    const chave = `${usuarioId}:${culturaId}`;
    const custom = this.limiaresPersonalizados.get(chave);
    if (custom !== undefined) {
      return { limiarMm: custom, personalizado: true };
    }
    return { limiarMm: padrao, personalizado: false };
  }

  public salvarLimiarUsuario(culturaId: number, usuarioId: number, limiarMm: number): number {
    const valorNormalizado = Number(limiarMm.toFixed(1));
    const chave = `${usuarioId}:${culturaId}`;
    this.limiaresPersonalizados.set(chave, valorNormalizado);
    return valorNormalizado;
  }
}

export const plantioRepository = new PlantioRepository();
