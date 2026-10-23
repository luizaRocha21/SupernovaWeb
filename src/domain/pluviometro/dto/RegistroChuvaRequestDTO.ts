import { FonteRegistroChuva } from '../model/RegistroChuva.js';

export interface RegistroChuvaRequestDTO {
  localidadeId?: number;
  usuarioId?: number;
  volumeMm: number;
  dataEvento?: string;
  fonte?: FonteRegistroChuva;
  observacao?: string;
  idClienteSync?: string;
}
