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
      volumeMm: registro.volumeMm,
      dataEvento: registro.dataEvento,
      fonte: registro.fonte,
      observacao: registro.observacao,
      criadoEm: registro.criadoEm,
      acumuladoLocalidadeMesMm,
      acumuladoUltimos30DiasMm
    };
  }

  public listarPorLocalidade(localidadeId = 1): {
    localidadeId: number;
    acumuladoMesMm: number;
    acumuladoUltimos30DiasMm: number;
    acumuladoUltimos7DiasMm: number;
    registros: RegistroChuvaResponseDTO[];
  } {
    const idValido = Number(localidadeId) > 0 ? Number(localidadeId) : 1;
    const registros = this.repository.listarPorLocalidade(idValido);
    return {
      localidadeId: idValido,
      acumuladoMesMm: this.repository.calcularAcumuladoMesAtual(idValido),
      acumuladoUltimos30DiasMm: this.repository.calcularAcumuladoJanelaDias(idValido, 30),
      acumuladoUltimos7DiasMm: this.repository.calcularAcumuladoJanelaDias(idValido, 7),
      registros: registros.map((r) => this.toResponseDTO(r))
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
    const dataEvento = (dto.dataEvento || new Date().toISOString().slice(0, 10)).slice(0, 10);

    const salvo = this.repository.salvar({
      localidadeId,
      usuarioId,
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
