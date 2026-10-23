import jwt from 'jsonwebtoken';
import { BusinessException } from '../exception/BusinessException.js';

export interface JwtPayloadData {
  id: number;
  nome: string;
  email?: string;
  telefone: string;
  perfil: string;
  localidadeId: number;
}

export class JwtService {
  private readonly secret: string;
  private readonly expiracaoMinutos: number;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'manejo-caatingueiro-jwt-secret-key-2026-min-32-chars';
    this.expiracaoMinutos = Number(process.env.JWT_EXPIRACAO_MIN) || 1440; // 24h padrão
  }

  public gerarToken(payload: JwtPayloadData): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: `${this.expiracaoMinutos}m`
    });
  }

  public verificarToken(token: string): JwtPayloadData {
    try {
      return jwt.verify(token, this.secret) as JwtPayloadData;
    } catch {
      throw new BusinessException('Sessão expirada ou token JWT inválido.', 401, 'TOKEN_INVALIDO');
    }
  }
}

export const jwtService = new JwtService();
