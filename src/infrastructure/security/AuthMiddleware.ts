import { Request, Response, NextFunction } from 'express';
import { jwtService, JwtPayloadData } from './JwtService.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadData;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      codigo: 'NAO_AUTORIZADO',
      mensagem: 'Token de autenticação Bearer não informado.',
      timestamp: new Date().toISOString(),
      caminho: req.originalUrl
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    req.user = jwtService.verificarToken(token);
    next();
  } catch {
    res.status(401).json({
      codigo: 'TOKEN_INVALIDO',
      mensagem: 'Token de autenticação inválido ou expirado.',
      timestamp: new Date().toISOString(),
      caminho: req.originalUrl
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      req.user = jwtService.verificarToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}
