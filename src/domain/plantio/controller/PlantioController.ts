import { Request, Response, NextFunction, Router } from 'express';
import { IPlantioController } from './IPlantioController.js';
import { PlantioService, plantioService } from '../service/PlantioService.js';

export class PlantioController implements IPlantioController {
  public readonly router: Router;

  constructor(private readonly service: PlantioService = plantioService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.get('/', (req, res, next) => this.diagnosticar(req, res, next));
    this.router.get('/diagnostico', (req, res, next) => this.diagnosticar(req, res, next));
    this.router.put('/:culturaId/limiar', (req, res, next) => this.atualizarLimiar(req, res, next));
    this.router.put('/limiar', (req, res, next) => this.atualizarLimiar(req, res, next));
    this.router.post('/limiar', (req, res, next) => this.atualizarLimiar(req, res, next));
  }

  public diagnosticar(req: Request, res: Response, next: NextFunction): void {
    try {
      const localidadeId = Number(req.query.localidadeId) || 1;
      const precipitacaoMm =
        req.query.precipitacaoMm !== undefined ? Number(req.query.precipitacaoMm) : undefined;
      const usuarioId = Number(req.query.usuarioId) || 1;

      const resultado = this.service.avaliarAptidao(localidadeId, precipitacaoMm, usuarioId);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public atualizarLimiar(req: Request, res: Response, next: NextFunction): void {
    try {
      const culturaId = Number(req.params.culturaId || req.body.culturaId || 1);
      const limiarMm = Number(req.body.limiarMm ?? req.body.limiarUsuarioMm);
      const usuarioId = Number(req.body.usuarioId) || 1;

      const atualizado = this.service.calibrarLimiar(culturaId, limiarMm, usuarioId);
      res.status(200).json(atualizado);
    } catch (error) {
      next(error);
    }
  }
}

export const plantioController = new PlantioController();
