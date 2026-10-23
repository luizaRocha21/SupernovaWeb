import { Cultura } from '../model/Cultura.js';

export interface IPlantioRepository {
  listarCulturas(): Cultura[];
  buscarCulturaPorId(id: number): Cultura | undefined;
  obterLimiarAtivo(culturaId: number, usuarioId?: number): { limiarMm: number; personalizado: boolean };
  salvarLimiarUsuario(culturaId: number, usuarioId: number, limiarMm: number): number;
}
