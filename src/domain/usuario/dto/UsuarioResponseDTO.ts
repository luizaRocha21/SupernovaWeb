import { TipoPerfil } from '../enums/TipoPerfil.js';
import { TipoFonteAgua } from '../enums/TipoFonteAgua.js';
import { RocaUsuario, StatusUsuario } from '../model/Usuario.js';

export interface UsuarioResponseDTO {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  perfil: TipoPerfil;
  abastecimento: TipoFonteAgua;
  localidadeId: number;
  status: StatusUsuario;
  emailVerificado?: boolean;
  consentimentoLocalizacao?: boolean;
  rocas: RocaUsuario[];
}

export interface LoginResponseDTO {
  token: string;
  tipoToken: 'Bearer';
  usuario: UsuarioResponseDTO;
}

