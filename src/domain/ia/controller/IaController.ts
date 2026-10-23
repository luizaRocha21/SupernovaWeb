import { Request, Response, NextFunction, Router } from 'express';
import { IIaController } from './IIaController.js';
import { IaService, iaService } from '../service/IaService.js';

export class IaController implements IIaController {
  public readonly router: Router;

  constructor(private readonly service: IaService = iaService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.post('/chat', (req, res, next) => {
      void this.chat(req, res, next);
    });
    this.router.post('/resumo-voz', (req, res, next) => {
      void this.resumoVoz(req, res, next);
    });
  }

  public async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.service.responderChat(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public async resumoVoz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.service.gerarResumoVoz(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const iaController = new IaController();
