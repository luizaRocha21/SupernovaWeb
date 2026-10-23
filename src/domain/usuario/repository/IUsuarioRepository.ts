import { RocaUsuario, StatusUsuario, Usuario } from '../model/Usuario.js';

export type NovoUsuarioInput = Omit<Usuario, 'id' | 'rocas' | 'status'> & {
  status?: StatusUsuario;
  rocas?: RocaUsuario[];
};

export interface IUsuarioRepository {
  listarTodos(): Usuario[];
  buscarPorId(id: number): Usuario | undefined;
  buscarPorEmail(email: string): Usuario | undefined;
  buscarPorTelefone(telefone: string): Usuario | undefined;
  buscarPorIdentificador(identificador: string): Usuario | undefined;
  salvar(usuario: NovoUsuarioInput): Usuario;
  criar(usuario: NovoUsuarioInput): Usuario;
  atualizar(id: number, dados: Partial<Usuario>): Usuario | undefined;
  remover(id: number): boolean;
  listarRocas(usuarioId: number): RocaUsuario[];
  adicionarRoca(usuarioId: number, dados: Omit<RocaUsuario, 'id' | 'usuarioId'>): RocaUsuario | undefined;
  atualizarRoca(usuarioId: number, rocaId: number, dados: Partial<Omit<RocaUsuario, 'id' | 'usuarioId'>>): RocaUsuario | undefined;
  removerRoca(usuarioId: number, rocaId: number): { removida: boolean; motivo?: string; rocasRestantes: RocaUsuario[] };
}

