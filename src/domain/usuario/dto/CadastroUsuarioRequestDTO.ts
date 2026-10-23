import { TipoPerfil } from '../enums/TipoPerfil.js';
import { TipoFonteAgua } from '../enums/TipoFonteAgua.js';
import { StatusUsuario } from '../model/Usuario.js';

export interface RocaRequestDTO {
  nome?: string;
  municipio?: string;
  uf?: string;
  codigoIbge?: string;
  latitude?: number;
  longitude?: number;
  culturas?: string[] | string;
  areaHectares?: number;
  principal?: boolean;
}

export interface AtualizarPerfilRequestDTO {
  nome?: string;
  telefone?: string;
  email?: string;
  abastecimento?: TipoFonteAgua;
  localidadeId?: number;
  consentimentoLocalizacao?: boolean;
  senha?: string;
  novaSenha?: string;
}

export interface CadastroUsuarioRequestDTO {
  nome: string;
  email: string;
  telefone?: string;
  senha?: string;
  perfil?: TipoPerfil;
  abastecimento?: TipoFonteAgua;
  localidadeId?: number;
  status?: StatusUsuario;
  consentimentoLocalizacao?: boolean;
  nomeRoca?: string;
  municipio?: string;
  uf?: string;
  codigoIbge?: string;
  latitude?: number;
  longitude?: number;
  culturas?: string[] | string;
  areaHectares?: number;
}

