import { Request, Response, NextFunction, Router } from 'express';

export interface IIaController {
  readonly router: Router;
  chat(req: Request, res: Response, next: NextFunction): Promise<void>;
  resumoVoz(req: Request, res: Response, next: NextFunction): Promise<void>;
}
