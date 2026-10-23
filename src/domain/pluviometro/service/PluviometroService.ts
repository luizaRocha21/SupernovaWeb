import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import { RegistroChuvaRequestDTO } from '../dto/RegistroChuvaRequestDTO.js';
import { RegistroChuvaResponseDTO } from '../dto/RegistroChuvaResponseDTO.js';
import { RegistroChuva } from '../model/RegistroChuva.js';
import { IPluviometroRepository } from '../repository/IPluviometroRepository.js';
import { pluviometroRepository } from '../repository/PluviometroRepository.js';

export class PluviometroService {
  constructor(private readonly repository: IPluviometroRepository = pluviometroRepository) {}

  private toResponseDTO(registro: RegistroChuva): RegistroChuvaResponseDTO {
    const acumuladoLocalidadeMesMm = this.repository.calcularAcumuladoMesAtual(registro.localidadeId);
    const acumuladoUltimos30DiasMm = this.repository.calcularAcumuladoJanelaDias(registro.localidadeId, 30);

    return {
      id: registro.id,
      localidadeId: registro.localidadeId,
      usuarioId: registro.usuarioId,
      rocaId: registro.rocaId,
      municipio: registro.municipio,
      volumeMm: registro.volumeMm,
      dataEvento: registro.dataEvento,
      fonte: registro.fonte,
      observacao: registro.observacao,
      criadoEm: registro.criadoEm,
      acumuladoLocalidadeMesMm,
      acumuladoUltimos30DiasMm
    };
  }

  public listarPorLocalidade(
    localidadeId = 1,
    rocaId?: number,
    size?: number
  ): {
    localidadeId: number;
    rocaId?: number;
    acumuladoMesMm: number;
    acumuladoUltimos30DiasMm: number;
    acumuladoUltimos7DiasMm: number;
    registros: RegistroChuvaResponseDTO[];
    content: RegistroChuvaResponseDTO[];
  } {
    const idValido = Number(localidadeId) > 0 ? Number(localidadeId) : 1;
    const rocaValida = rocaId !== undefined && Number(rocaId) > 0 ? Number(rocaId) : undefined;
    const limite = size !== undefined && Number(size) > 0 ? Number(size) : undefined;

    const brutos = this.repository.listarPorLocalidade(idValido, rocaValida);
    const recortados = limite ? brutos.slice(0, limite) : brutos;
    const registros = recortados.map((r) => this.toResponseDTO(r));

    return {
      localidadeId: idValido,
      rocaId: rocaValida,
      acumuladoMesMm: this.repository.calcularAcumuladoMesAtual(idValido),
      acumuladoUltimos30DiasMm: this.repository.calcularAcumuladoJanelaDias(idValido, 30),
      acumuladoUltimos7DiasMm: this.repository.calcularAcumuladoJanelaDias(idValido, 7),
      registros,
      content: registros
    };
  }

  public registrarChuva(dto: RegistroChuvaRequestDTO): RegistroChuvaResponseDTO {
    const volumeMm = Number(dto.volumeMm);
    if (Number.isNaN(volumeMm) || volumeMm <= 0 || volumeMm > 500) {
      throw new BusinessException(
        'O volume de chuva deve ser um valor válido maior que 0 mm e menor ou igual a 500 mm.',
        400,
        'VOLUME_CHUVA_INVALIDO'
      );
    }

    const localidadeId = Number(dto.localidadeId) > 0 ? Number(dto.localidadeId) : 1;
    const usuarioId = Number(dto.usuarioId) > 0 ? Number(dto.usuarioId) : 1;
    const rocaId = dto.rocaId !== undefined && Number(dto.rocaId) > 0 ? Number(dto.rocaId) : undefined;
    const municipio = dto.municipio ? String(dto.municipio).trim() : undefined;
    const dataEvento = (dto.dataEvento || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const salvo = this.repository.salvar({
      localidadeId,
      usuarioId,
      rocaId,
      municipio,
      volumeMm: Number(volumeMm.toFixed(1)),
      dataEvento,
      fonte: dto.fonte || 'PLUVIOMETRO_PROPRIO',
      observacao: dto.observacao?.trim(),
      idClienteSync: dto.idClienteSync
    });

    return this.toResponseDTO(salvo);
  }
}

export const pluviometroService = new PluviometroService();
