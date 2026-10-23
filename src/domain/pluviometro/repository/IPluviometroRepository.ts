import { RegistroChuva } from '../model/RegistroChuva.js';

export interface IPluviometroRepository {
  listarPorLocalidade(localidadeId: number, rocaId?: number): RegistroChuva[];
  listarPorUsuario(usuarioId: number): RegistroChuva[];
  salvar(registro: Omit<RegistroChuva, 'id' | 'criadoEm'>): RegistroChuva;
  calcularAcumuladoJanelaDias(localidadeId: number, janelaDias: number): number;
  calcularAcumuladoMesAtual(localidadeId: number): number;
}
