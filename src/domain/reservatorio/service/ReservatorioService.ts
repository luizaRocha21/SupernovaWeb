import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import {
  AtualizarNivelReservatorioRequestDTO,
  CriarReservatorioRequestDTO,
  RegistrarChecklistRequestDTO,
  ReservatorioResponseDTO
} from '../dto/ReservatorioDTO.js';
import { EscalaNivelReservatorio, TipoReservatorio } from '../enums/TipoReservatorio.js';
import { Reservatorio } from '../model/Reservatorio.js';
import { IReservatorioRepository } from '../repository/IReservatorioRepository.js';
import { reservatorioRepository } from '../repository/ReservatorioRepository.js';

export class ReservatorioService {
  constructor(private readonly repository: IReservatorioRepository = reservatorioRepository) {}

  private calcularEscala(nivelPercentual: number): EscalaNivelReservatorio {
    if (nivelPercentual >= 75) return EscalaNivelReservatorio.CHEIO;
    if (nivelPercentual >= 45) return EscalaNivelReservatorio.MEDIO;
    if (nivelPercentual >= 25) return EscalaNivelReservatorio.BAIXO;
    return EscalaNivelReservatorio.CRITICO;
  }

  private toResponseDTO(r: Reservatorio): ReservatorioResponseDTO {
    const volumeEstimadoLitros = Math.round((r.capacidadeLitros * r.ultimoNivelPercentual) / 100);
    return {
      id: r.id,
      apelido: r.apelido,
      tipo: r.tipo,
      responsavelId: r.responsavelId,
      localidadeId: r.localidadeId,
      capacidadeLitros: r.capacidadeLitros,
      volumeEstimadoLitros,
      ultimoNivelPercentual: r.ultimoNivelPercentual,
      escala: r.escala,
      profundidadeMetros: r.profundidadeMetros,
      consentimentoAgregacao: r.consentimentoAgregacao,
      alertaEstiagemAtivo: r.alertaEstiagemAtivo,
      mensagemAlerta: r.mensagemAlerta,
      ultimoChecklist: r.ultimoChecklist,
      atualizadoEm: r.atualizadoEm
    };
  }

  public listar(localidadeId?: number): ReservatorioResponseDTO[] {
    return this.repository.listarTodos(localidadeId).map((r) => this.toResponseDTO(r));
  }

  public cadastrar(dto: CriarReservatorioRequestDTO): ReservatorioResponseDTO {
    const apelido = (dto.apelido || '').trim();
    if (!apelido || apelido.length < 3) {
      throw new BusinessException(
        'Informe um nome ou apelido válido para o reservatório (mínimo 3 caracteres).',
        400,
        'APELIDO_INVALIDO'
      );
    }

    const nivel = dto.nivelPercentual !== undefined ? Number(dto.nivelPercentual) : 50;
    if (Number.isNaN(nivel) || nivel < 0 || nivel > 100) {
      throw new BusinessException(
        'O nível percentual do reservatório deve estar entre 0% e 100%.',
        400,
        'NIVEL_INVALIDO'
      );
    }

    const capacidade = Number(dto.capacidadeLitros) > 0 ? Number(dto.capacidadeLitros) : 16000;
    const alertaEstiagemAtivo = nivel < 25;

    const novo = this.repository.salvar({
      apelido,
      tipo: dto.tipo || TipoReservatorio.CISTERNA,
      responsavelId: Number(dto.responsavelId) || 1,
      localidadeId: Number(dto.localidadeId) || 1,
      capacidadeLitros: capacidade,
      ultimoNivelPercentual: Math.round(nivel),
      escala: this.calcularEscala(nivel),
      profundidadeMetros: dto.profundidadeMetros ?? null,
      consentimentoAgregacao: dto.consentimentoAgregacao ?? true,
      alertaEstiagemAtivo,
      mensagemAlerta: alertaEstiagemAtivo
        ? 'Alerta de Estiagem: nível abaixo de 25%. Priorize água para consumo familiar e animais.'
        : undefined,
      atualizadoEm: new Date().toISOString()
    });

    return this.toResponseDTO(novo);
  }

  public atualizarNivel(
    id: number,
    dto: AtualizarNivelReservatorioRequestDTO
  ): ReservatorioResponseDTO {
    const existente = this.repository.buscarPorId(id);
    if (!existente) {
      throw new BusinessException('Reservatório não encontrado.', 404, 'RESERVATORIO_NAO_ENCONTRADO');
    }

    const nivel = Number(dto.nivelPercentual);
    if (Number.isNaN(nivel) || nivel < 0 || nivel > 100) {
      throw new BusinessException(
        'O nível percentual deve estar entre 0% e 100%.',
        400,
        'NIVEL_INVALIDO'
      );
    }

    const alertaEstiagemAtivo = nivel < 25;
    const atualizado = this.repository.atualizar(id, {
      ultimoNivelPercentual: Math.round(nivel),
      escala: this.calcularEscala(nivel),
      profundidadeMetros:
        dto.profundidadeMetros !== undefined ? dto.profundidadeMetros : existente.profundidadeMetros,
      alertaEstiagemAtivo,
      mensagemAlerta: alertaEstiagemAtivo
        ? `Alerta de Estiagem Crítica (${Math.round(nivel)}%): nível abaixo de 25%. Reduza o uso agrícola e priorize o abastecimento doméstico.`
        : undefined
    });

    if (!atualizado) {
      throw new BusinessException('Falha ao atualizar nível do reservatório.', 400);
    }

    return this.toResponseDTO(atualizado);
  }

  public registrarChecklist(
    id: number,
    dto: RegistrarChecklistRequestDTO
  ): ReservatorioResponseDTO {
    const existente = this.repository.buscarPorId(id);
    if (!existente) {
      throw new BusinessException('Reservatório não encontrado.', 404, 'RESERVATORIO_NAO_ENCONTRADO');
    }

    const protecaoEntrada = Boolean(dto.protecaoEntrada);
    const aguaSemOdorOuCor = Boolean(dto.aguaSemOdorOuCor);
    const entornoLimpo = Boolean(dto.entornoLimpo);
    const estruturaIntegra = Boolean(dto.estruturaIntegra);

    const riscoPotabilidade = !(
      protecaoEntrada &&
      aguaSemOdorOuCor &&
      entornoLimpo &&
      estruturaIntegra
    );

    this.repository.salvarChecklist({
      reservatorioId: id,
      dataAvaliacao: new Date().toISOString().slice(0, 10),
      protecaoEntrada,
      aguaSemOdorOuCor,
      entornoLimpo,
      estruturaIntegra,
      riscoPotabilidade,
      observacao:
        (dto.observacao || '').trim() ||
        (riscoPotabilidade
          ? 'Atenção sanitária: recomenda-se filtragem, cloração com hipoclorito e revisão de calhas/tampa.'
          : 'Condições sanitárias adequadas para conservação da água.')
    });

    const atualizado = this.repository.buscarPorId(id)!;
    return this.toResponseDTO(atualizado);
  }
}

export const reservatorioService = new ReservatorioService();
