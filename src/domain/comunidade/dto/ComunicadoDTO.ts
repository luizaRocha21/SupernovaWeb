import { SeveridadeAlerta } from '../enums/SeveridadeAlerta.js';
import { TipoComunicado } from '../model/Comunicado.js';

export interface CriarComunicadoRequestDTO {
  localidadeId?: number;
  autorId?: number;
  autorNome?: string;
  tipo?: TipoComunicado;
  severidade?: SeveridadeAlerta;
  titulo: string;
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
  severidade: SeveridadeAlerta;
  titulo: string;
  conteudo: string;
  fonte: string;
  publicadoEm: string;
  vigenteAte: string;
}
