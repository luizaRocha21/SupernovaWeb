import { ChecklistSanitarioModel, Reservatorio } from '../model/Reservatorio.js';

export interface IReservatorioRepository {
  listarTodos(localidadeId?: number): Reservatorio[];
  buscarPorId(id: number): Reservatorio | undefined;
  salvar(reservatorio: Omit<Reservatorio, 'id'>): Reservatorio;
  atualizar(id: number, dados: Partial<Reservatorio>): Reservatorio | undefined;
  salvarChecklist(
    checklist: Omit<ChecklistSanitarioModel, 'id' | 'criadoEm'>
  ): ChecklistSanitarioModel;
}
