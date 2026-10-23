import { Request, Response, NextFunction, Router } from 'express';

export interface IComunidadeController {
  readonly router: Router;
  listar(req: Request, res: Response, next: NextFunction): void;
  publicar(req: Request, res: Response, next: NextFunction): void;
}
