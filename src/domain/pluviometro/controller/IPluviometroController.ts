import { Request, Response, NextFunction, Router } from 'express';

export interface IPluviometroController {
  readonly router: Router;
  listar(req: Request, res: Response, next: NextFunction): void;
  registrar(req: Request, res: Response, next: NextFunction): void;
}
