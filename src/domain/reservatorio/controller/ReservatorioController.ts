import { Request, Response, NextFunction, Router } from 'express';
import { IReservatorioController } from './IReservatorioController.js';
import { ReservatorioService, reservatorioService } from '../service/ReservatorioService.js';

export class ReservatorioController implements IReservatorioController {
  public readonly router: Router;

  constructor(private readonly service: ReservatorioService = reservatorioService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.get('/', (req, res, next) => this.listar(req, res, next));
    this.router.post('/', (req, res, next) => this.cadastrar(req, res, next));
    this.router.put('/:id/nivel', (req, res, next) => this.atualizarNivel(req, res, next));
    this.router.post('/:id/niveis', (req, res, next) => this.atualizarNivel(req, res, next));
    this.router.post('/:id/checklist', (req, res, next) => this.registrarChecklist(req, res, next));
  }

  public listar(req: Request, res: Response, next: NextFunction): void {
    try {
      const localidadeId = req.query.localidadeId ? Number(req.query.localidadeId) : undefined;
      const lista = this.service.listar(localidadeId);
      res.status(200).json(lista);
    } catch (error) {
      next(error);
    }
  }

  public cadastrar(req: Request, res: Response, next: NextFunction): void {
    try {
      const criado = this.service.cadastrar(req.body);
      res.status(201).json(criado);
    } catch (error) {
      next(error);
    }
  }

  public atualizarNivel(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const atualizado = this.service.atualizarNivel(id, req.body);
      res.status(200).json(atualizado);
    } catch (error) {
      next(error);
    }
  }

  public registrarChecklist(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const atualizado = this.service.registrarChecklist(id, req.body);
      res.status(201).json(atualizado);
    } catch (error) {
      next(error);
    }
  }
}

export const reservatorioController = new ReservatorioController();
