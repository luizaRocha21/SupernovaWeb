import { Request, Response, NextFunction, Router } from 'express';
import { IPluviometroController } from './IPluviometroController.js';
import { PluviometroService, pluviometroService } from '../service/PluviometroService.js';

export class PluviometroController implements IPluviometroController {
  public readonly router: Router;

  constructor(private readonly service: PluviometroService = pluviometroService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.get('/', (req, res, next) => this.listar(req, res, next));
    this.router.post('/', (req, res, next) => this.registrar(req, res, next));
  }

  public listar(req: Request, res: Response, next: NextFunction): void {
    try {
      const localidadeId = Number(req.query.localidadeId) || 1;
      const resultado = this.service.listarPorLocalidade(localidadeId);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public registrar(req: Request, res: Response, next: NextFunction): void {
    try {
      const salvo = this.service.registrarChuva(req.body);
      res.status(201).json(salvo);
    } catch (error) {
      next(error);
    }
  }
}

export const pluviometroController = new PluviometroController();
