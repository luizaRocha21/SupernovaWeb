import { SeveridadeAlerta } from '../enums/SeveridadeAlerta.js';

export type TipoComunicado = 'ALERTA_CLIMATICO' | 'AVISO_MURAL';

export interface Comunicado {
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
