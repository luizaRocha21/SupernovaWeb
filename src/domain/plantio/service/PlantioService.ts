import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import { pluviometroRepository } from '../../pluviometro/repository/PluviometroRepository.js';
import {
  AvaliacaoCulturaDTO,
  DiagnosticoPlantioResponseDTO
} from '../dto/DiagnosticoPlantioResponseDTO.js';
import { StatusAptidaoPlantio } from '../enums/StatusAptidaoPlantio.js';
import { IPlantioRepository } from '../repository/IPlantioRepository.js';
import { plantioRepository } from '../repository/PlantioRepository.js';

const DESCRICOES_PADRAO_POR_SLUG: Record<string, string> = {
  milho:
    'Exige pelo menos 120 mm acumulados em 30 dias para sustentar o crescimento inicial e o pendoamento com segurança.',
  'feijao-caupi':
    'Exige pelo menos 110 mm acumulados em 20 dias. Cultura de ciclo rápido e boa tolerância ao calor do Semiárido Baiano.',
  mamona:
    'Exige pelo menos 90 mm acumulados em 25 dias. Planta rústica e resistente ao calor, indicada para aproveitar as primeiras águas firmes da estação.'
};

const NOMES_AMIGAVEIS_POR_SLUG: Record<string, string> = {
  milho: 'Milho',
  'feijao-caupi': 'Feijão-Caupi (Corda)',
  mamona: 'Mamona'
};

export class PlantioService {
  constructor(private readonly repository: IPlantioRepository = plantioRepository) {}

  public avaliarAptidao(
    localidadeId = 1,
    precipitacaoObservadaMm?: number,
    usuarioId = 1
  ): DiagnosticoPlantioResponseDTO {
    const idLocal = Number(localidadeId) > 0 ? Number(localidadeId) : 1;
    const chuvaPluviometro = pluviometroRepository.calcularAcumuladoJanelaDias(idLocal, 30);
    const chuvaBaseRaw =
      precipitacaoObservadaMm !== undefined && !Number.isNaN(Number(precipitacaoObservadaMm))
        ? Number(precipitacaoObservadaMm)
        : Math.max(Number(chuvaPluviometro) || 0, 40.0);
    const chuvaBase = Number.isFinite(chuvaBaseRaw) && chuvaBaseRaw >= 0 ? chuvaBaseRaw : 0;

    const avaliacoes: AvaliacaoCulturaDTO[] = this.repository.listarCulturas().map((cultura) => {
      const { limiarMm, personalizado } = this.repository.obterLimiarAtivo(cultura.id, usuarioId);
      const limiarSeguro = Number.isFinite(Number(limiarMm)) && Number(limiarMm) > 0
        ? Number(limiarMm)
        : cultura.limiarPadraoMm;
      const percentual = limiarSeguro > 0 ? Math.round((chuvaBase / limiarSeguro) * 100) : 0;

      let statusAptidao = StatusAptidaoPlantio.INAPTO;
      let orientacaoStatus =
        cultura.orientacaoInapto ||
        DESCRICOES_PADRAO_POR_SLUG[cultura.slug] ||
        'Aguarde novas chuvas para iniciar a semeadura com segurança.';

      if (chuvaBase >= limiarSeguro) {
        statusAptidao = StatusAptidaoPlantio.FAVORAVEL;
        orientacaoStatus =
          cultura.orientacaoFavoravel ||
          DESCRICOES_PADRAO_POR_SLUG[cultura.slug] ||
          'Umidade favorável para o plantio com cobertura morta no solo.';
      } else if (chuvaBase >= limiarSeguro * 0.65) {
        statusAptidao = StatusAptidaoPlantio.ATENCAO;
        orientacaoStatus =
          cultura.orientacaoAtencao ||
          DESCRICOES_PADRAO_POR_SLUG[cultura.slug] ||
          'Umidade intermediária. Avalie o molhado da terra antes de semear.';
      }

      // Garante texto claro e sem undefined, especialmente para Mamona e demais lavouras
      const recomendacaoFinal =
        cultura.slug === 'mamona' && statusAptidao === StatusAptidaoPlantio.INAPTO
          ? DESCRICOES_PADRAO_POR_SLUG.mamona
          : String(orientacaoStatus || DESCRICOES_PADRAO_POR_SLUG[cultura.slug] || '').trim();

      return {
        culturaId: cultura.id,
        slug: cultura.slug,
        nome: NOMES_AMIGAVEIS_POR_SLUG[cultura.slug] || cultura.nome,
        janelaDias: Number(cultura.janelaDias) || 30,
        limiarPadraoMm: Number(cultura.limiarPadraoMm) || limiarSeguro,
        limiarAtivoMm: limiarSeguro,
        limiarPersonalizado: Boolean(personalizado),
        precipitacaoObservadaMm: Number(chuvaBase.toFixed(1)),
        percentualAtingido: Number.isFinite(percentual) ? percentual : 0,
        statusAptidao,
        recomendacao: recomendacaoFinal,
        fonteLimiar:
          cultura.fonteLimiar ||
          'Referência agrometeorológica para o Semiárido Baiano (Embrapa Semiárido)'
      };
    });

    const favoraveis = avaliacoes.filter((a) => a.statusAptidao === StatusAptidaoPlantio.FAVORAVEL);
    const emAtencao = avaliacoes.filter((a) => a.statusAptidao === StatusAptidaoPlantio.ATENCAO);

    let statusGeral = StatusAptidaoPlantio.INAPTO;
    let resumoConsultivo =
      'Volume de chuva abaixo do mínimo recomendado para semeadura imediata. Aguarde novas chuvas firmes e mantenha a terra protegida com palhada.';

    if (favoraveis.length >= 2) {
      statusGeral = StatusAptidaoPlantio.FAVORAVEL;
      const nomes = favoraveis.map((f) => f.nome).join(' e ');
      resumoConsultivo = `Umidade da terra favorável para plantar ${nomes}.`;
    } else if (favoraveis.length === 1) {
      statusGeral = StatusAptidaoPlantio.FAVORAVEL;
      resumoConsultivo = `Condição favorável para ${favoraveis[0].nome}; acompanhe a chuva antes de semear as demais lavouras.`;
    } else if (emAtencao.length > 0) {
      statusGeral = StatusAptidaoPlantio.ATENCAO;
      const nomesAtencao = emAtencao.map((a) => a.nome).join(', ');
      resumoConsultivo = `Atenção ao solo: umidade em recuperação para ${nomesAtencao}. Confira a profundidade do molhado na terra antes de plantar.`;
    }

    return {
      localidadeId: idLocal,
      precipitacaoReferenciaMm: Number(chuvaBase.toFixed(1)),
      statusGeral,
      resumoConsultivo,
      avisoConsultivoRN12:
        'Importante: esta orientação apoia o seu planejamento, mas a decisão final é sempre sua, conforme a realidade da sua terra.',
      culturas: avaliacoes,
      atualizadoEm: new Date().toISOString()
    };
  }

  public calibrarLimiar(
    culturaId: number,
    limiarMm: number,
    usuarioId = 1
  ): AvaliacaoCulturaDTO {
    const cultura = this.repository.buscarCulturaPorId(culturaId);
    if (!cultura) {
      throw new BusinessException('Lavoura não encontrada.', 404, 'CULTURA_NAO_ENCONTRADA');
    }

    const valor = Number(limiarMm);
    if (Number.isNaN(valor) || valor < 20 || valor > 400) {
      throw new BusinessException(
        'A chuva mínima personalizada deve estar entre 20 mm e 400 mm.',
        400,
        'LIMIAR_INVALIDO'
      );
    }

    this.repository.salvarLimiarUsuario(culturaId, usuarioId, valor);
    const diagnostico = this.avaliarAptidao(1, undefined, usuarioId);
    const avaliacao = diagnostico.culturas.find((c) => c.culturaId === culturaId);
    if (!avaliacao) {
      throw new BusinessException('Não foi possível atualizar a referência da lavoura.', 400);
    }
    return avaliacao;
  }
}

export const plantioService = new PlantioService();
