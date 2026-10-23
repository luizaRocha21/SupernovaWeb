import { Request, Response, NextFunction, Router } from 'express';

export interface IPlantioController {
  readonly router: Router;
  diagnosticar(req: Request, res: Response, next: NextFunction): void;
  atualizarLimiar(req: Request, res: Response, next: NextFunction): void;
}
