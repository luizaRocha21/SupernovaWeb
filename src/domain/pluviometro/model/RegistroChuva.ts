export type FonteRegistroChuva = 'PLUVIOMETRO_PROPRIO' | 'ESTACAO' | 'ESTIMATIVA';

export interface RegistroChuva {
  id: number;
  localidadeId: number;
  usuarioId: number;
  volumeMm: number;
  dataEvento: string;
  fonte: FonteRegistroChuva;
  observacao?: string;
  idClienteSync?: string;
  criadoEm: string;
}
