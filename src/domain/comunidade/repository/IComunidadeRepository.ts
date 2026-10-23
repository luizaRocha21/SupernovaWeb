import { Comunicado } from '../model/Comunicado.js';

export interface IComunidadeRepository {
  listarTodos(localidadeId?: number): Comunicado[];
  salvar(comunicado: Omit<Comunicado, 'id'>): Comunicado;
}
