import { Request, Response, NextFunction, Router } from 'express';

export interface IReservatorioController {
  readonly router: Router;
  listar(req: Request, res: Response, next: NextFunction): void;
  cadastrar(req: Request, res: Response, next: NextFunction): void;
  atualizarNivel(req: Request, res: Response, next: NextFunction): void;
  registrarChecklist(req: Request, res: Response, next: NextFunction): void;
}
