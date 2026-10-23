import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import {
  ComunicadoResponseDTO,
  CriarComunicadoRequestDTO
} from '../dto/ComunicadoDTO.js';
import { SeveridadeAlerta } from '../enums/SeveridadeAlerta.js';
import { IComunidadeRepository } from '../repository/IComunidadeRepository.js';
import { comunidadeRepository } from '../repository/ComunidadeRepository.js';
import { radarMeteorologicoService } from '../../clima/service/RadarMeteorologicoService.js';
import { AlertaRadarResponseDTO } from '../../clima/dto/AlertaRadarResponseDTO.js';

export function escapeHtml(texto: string): string {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class ComunidadeService {
  private alertasRadarCache: AlertaRadarResponseDTO[] = [];

  constructor(private readonly repository: IComunidadeRepository = comunidadeRepository) {
    void this.sincronizarAlertasRadar('BA');
  }

  public async sincronizarAlertasRadar(uf = 'BA'): Promise<AlertaRadarResponseDTO[]> {
    try {
      const alertas = await radarMeteorologicoService.listarAlertas(uf);
      this.alertasRadarCache = alertas;
      return alertas;
    } catch {
      return this.alertasRadarCache;
    }
  }

  private converterSeveridadeRadar(severidadeRaw: string): SeveridadeAlerta {
    const s = String(severidadeRaw || '').toUpperCase();
    if (s.includes('GRANDE PERIGO') || s.includes('CRITIC') || s.includes('VERMELH')) {
      return SeveridadeAlerta.CRITICO;
    }
    if (s.includes('PERIGO') || s.includes('ATEN') || s.includes('AMAREL') || s.includes('LARANJ')) {
      return SeveridadeAlerta.ATENCAO;
    }
    return SeveridadeAlerta.INFO;
  }

  private mapearAlertasRadarParaComunicados(localidadeId?: number): ComunicadoResponseDTO[] {
    void this.sincronizarAlertasRadar('BA');

    return this.alertasRadarCache.map((alerta, idx) => {
      const riscosTexto = (alerta.riscos || []).join(' ');
      const instrucoesTexto = (alerta.instrucoes || []).join(' ');
      const municipiosTexto = (alerta.municipios_afetados || []).slice(0, 6).join(', ');
      const conteudoCombinado = `${riscosTexto} Recomendações: ${instrucoesTexto}${
        municipiosTexto ? ` (Municípios: ${municipiosTexto})` : ''
      }`.trim();

      return {
        id: 9000 + idx,
        localidadeId: Number(localidadeId) || 1,
        autorId: 0,
        autorNome: escapeHtml('INMET · Radar Meteorológico'),
        tipo: 'ALERTA_CLIMATICO',
        severidade: this.converterSeveridadeRadar(alerta.severidade),
        titulo: escapeHtml(alerta.evento),
        conteudo: escapeHtml(conteudoCombinado),
        fonte: 'RadarMeteorológico (radarmeteorologico.com.br) / INMET',
        publicadoEm: alerta.inicio || new Date().toISOString(),
        vigenteAte:
          alerta.fim || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    });
  }

  public listarComunicados(localidadeId?: number): {
    alertas: ComunicadoResponseDTO[];
    avisosMural: ComunicadoResponseDTO[];
    todos: ComunicadoResponseDTO[];
  } {
    const locais = this.repository.listarTodos(localidadeId);
    const alertasRadarMapeados = this.mapearAlertasRadarParaComunicados(localidadeId);

    const alertasLocais = locais.filter((c) => c.tipo === 'ALERTA_CLIMATICO');
    const avisosMural = locais.filter((c) => c.tipo === 'AVISO_MURAL');
    const alertas = [...alertasRadarMapeados, ...alertasLocais];
    const todos = [...alertas, ...avisosMural];

    return {
      alertas,
      avisosMural,
      todos
    };
  }

  public publicar(dto: CriarComunicadoRequestDTO): ComunicadoResponseDTO {
    let tituloBruto = (dto.titulo || '').trim();
    let conteudoBruto = (dto.conteudo || dto.mensagem || '').trim();

    if (!tituloBruto && conteudoBruto.includes(':')) {
      const idx = conteudoBruto.indexOf(':');
      tituloBruto = conteudoBruto.slice(0, idx).trim();
      conteudoBruto = conteudoBruto.slice(idx + 1).trim();
    } else if (!tituloBruto && conteudoBruto) {
      tituloBruto = 'Aviso Comunitário';
    }

    if (!tituloBruto || tituloBruto.length < 3) {
      throw new BusinessException(
        'O título do aviso ou alerta deve ter pelo menos 3 caracteres.',
        400,
        'TITULO_INVALIDO'
      );
    }

    if (!conteudoBruto || conteudoBruto.length < 5) {
      throw new BusinessException(
        'A mensagem do comunicado deve conter pelo menos 5 caracteres.',
        400,
        'CONTEUDO_INVALIDO'
      );
    }

    const severidadesValidas = [
      SeveridadeAlerta.INFO,
      SeveridadeAlerta.ATENCAO,
      SeveridadeAlerta.CRITICO
    ];
    const candidatoSeveridade = (dto.severidade || dto.nivel || '').toUpperCase() as SeveridadeAlerta;
    const severidade = severidadesValidas.includes(candidatoSeveridade)
      ? candidatoSeveridade
      : SeveridadeAlerta.INFO;

    const tipoRaw = String(dto.tipo || '').toUpperCase();
    const tipoNormalizado =
      tipoRaw === 'ALERTA_CLIMATICO' || tipoRaw === 'AVISO_MURAL'
        ? (tipoRaw as 'ALERTA_CLIMATICO' | 'AVISO_MURAL')
        : 'AVISO_MURAL';

    const categoriasValidas = ['SEMENTES', 'AGUA', 'MUTIRAO', 'DEFESA_CIVIL', 'GERAL'];
    const categoriaCand = String(dto.categoria || (tipoRaw !== 'AVISO_MURAL' && tipoRaw !== 'ALERTA_CLIMATICO' ? tipoRaw : 'GERAL')).toUpperCase();
    const categoria = categoriasValidas.includes(categoriaCand) ? categoriaCand : 'GERAL';

    const agora = new Date();
    const vigenteAte = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return this.repository.salvar({
      localidadeId: Number(dto.localidadeId) || 1,
      autorId: Number(dto.autorId) || 1,
      autorNome: escapeHtml((dto.autorNome || 'Liderança Comunitária').trim()),
      tipo: tipoNormalizado,
      categoria,
      municipio: dto.municipio ? escapeHtml(dto.municipio.trim()) : 'Irecê',
      severidade,
      titulo: escapeHtml(tituloBruto),
      conteudo: escapeHtml(conteudoBruto),
      fonte: escapeHtml((dto.fonte || 'Mural Comunitário Manejo Caatingueiro').trim()),
      publicadoEm: agora.toISOString(),
      vigenteAte
    });
  }
}

export const comunidadeService = new ComunidadeService();
