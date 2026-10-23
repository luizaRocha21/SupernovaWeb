import { Request, Response, NextFunction, Router } from 'express';
import { IComunidadeController } from './IComunidadeController.js';
import { ComunidadeService, comunidadeService } from '../service/ComunidadeService.js';

export class ComunidadeController implements IComunidadeController {
  public readonly router: Router;

  constructor(private readonly service: ComunidadeService = comunidadeService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.get('/', (req, res, next) => this.listar(req, res, next));
    this.router.post('/', (req, res, next) => this.publicar(req, res, next));
  }

  public listar(req: Request, res: Response, next: NextFunction): void {
    try {
      const localidadeId = req.query.localidadeId ? Number(req.query.localidadeId) : undefined;
      const dados = this.service.listarComunicados(localidadeId);
      res.status(200).json(dados);
    } catch (error) {
      next(error);
    }
  }

  public publicar(req: Request, res: Response, next: NextFunction): void {
    try {
      const publicado = this.service.publicar(req.body);
      res.status(201).json(publicado);
    } catch (error) {
      next(error);
    }
  }
}

export const comunidadeController = new ComunidadeController();
