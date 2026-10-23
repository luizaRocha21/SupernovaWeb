import { SeveridadeAlerta } from '../enums/SeveridadeAlerta.js';
import { TipoComunicado } from '../model/Comunicado.js';

export interface CriarComunicadoRequestDTO {
  localidadeId?: number;
  autorId?: number;
  autorNome?: string;
  tipo?: TipoComunicado | string;
  categoria?: string;
  municipio?: string;
  severidade?: SeveridadeAlerta;
  nivel?: string;
  titulo?: string;
  conteudo?: string;
  mensagem?: string;
  fonte?: string;
}

export interface ComunicadoResponseDTO {
  id: number;
  localidadeId: number;
  autorId: number;
  autorNome: string;
  tipo: TipoComunicado;
  categoria?: string;
  municipio?: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  conteudo: string;
  fonte: string;
  publicadoEm: string;
  vigenteAte: string;
}

