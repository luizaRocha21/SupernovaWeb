import { TipoPerfil } from '../enums/TipoPerfil.js';
import { TipoFonteAgua } from '../enums/TipoFonteAgua.js';

export type StatusUsuario = 'Ativo' | 'Inativo';

export interface RocaUsuario {
  id: number;
  usuarioId: number;
  nome: string;
  municipio: string;
  uf: string;
  codigoIbge: string;
  latitude: number;
  longitude: number;
  culturas: string[];
  areaHectares?: number;
  principal: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  senhaHash: string;
  perfil: TipoPerfil;
  abastecimento: TipoFonteAgua;
  localidadeId: number;
  status: StatusUsuario;
  emailVerificado?: boolean;
  provedorAuth?: 'LOCAL' | 'GOOGLE_OIDC';
  googleSub?: string;
  fotoUrl?: string;
  consentimentoLocalizacao?: boolean;
  rocas: RocaUsuario[];
  criadoEm?: string;
}

