import { FonteRegistroChuva } from '../model/RegistroChuva.js';

export interface RegistroChuvaResponseDTO {
  id: number;
  localidadeId: number;
  usuarioId: number;
  rocaId?: number;
  municipio?: string;
  volumeMm: number;
  dataEvento: string;
  fonte: FonteRegistroChuva;
  observacao?: string;
  criadoEm: string;
  acumuladoLocalidadeMesMm: number;
  acumuladoUltimos30DiasMm: number;
}
