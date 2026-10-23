import { Request, Response, NextFunction, Router } from 'express';

export interface IClimaController {
  readonly router: Router;
  obterDiagnostico(req: Request, res: Response, next: NextFunction): Promise<void>;
  listarAlertasRadar(req: Request, res: Response, next: NextFunction): Promise<void>;
  obterTemperaturasRadar(req: Request, res: Response, next: NextFunction): Promise<void>;
  buscarCidadesRadar(req: Request, res: Response, next: NextFunction): Promise<void>;
}
