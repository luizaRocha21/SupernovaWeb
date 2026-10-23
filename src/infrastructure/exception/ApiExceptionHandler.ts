import { Request, Response, NextFunction } from 'express';
import { BusinessException } from './BusinessException.js';
import { ErrorResponseDTO } from './ErrorResponseDTO.js';

export function ApiExceptionHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof BusinessException) {
    const response: ErrorResponseDTO = {
      codigo: err.codigo,
      mensagem: err.message,
      timestamp: new Date().toISOString(),
      caminho: req.originalUrl
    };
    res.status(err.statusCode).json(response);
    return;
  }

  const mensagem = err instanceof Error ? err.message : 'Erro interno inesperado no servidor.';
  const response: ErrorResponseDTO = {
    codigo: 'ERRO_INTERNO_SERVIDOR',
    mensagem,
    timestamp: new Date().toISOString(),
    caminho: req.originalUrl
  };
  res.status(500).json(response);
}
