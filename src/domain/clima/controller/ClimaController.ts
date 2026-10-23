import { Request, Response, NextFunction, Router } from 'express';
import { IClimaController } from './IClimaController.js';
import { ClimaService, climaService } from '../service/ClimaService.js';
import {
  RadarMeteorologicoService,
  radarMeteorologicoService
} from '../service/RadarMeteorologicoService.js';

export class ClimaController implements IClimaController {
  public readonly router: Router;

  constructor(
    private readonly service: ClimaService = climaService,
    private readonly radarService: RadarMeteorologicoService = radarMeteorologicoService
  ) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.get('/diagnostico', (req, res, next) => {
      void this.obterDiagnostico(req, res, next);
    });

    this.router.get('/alertas', (req, res, next) => {
      void this.listarAlertasRadar(req, res, next);
    });

    this.router.get('/temperaturas', (req, res, next) => {
      void this.obterTemperaturasRadar(req, res, next);
    });

    this.router.get('/cidades', (req, res, next) => {
      void this.buscarCidadesRadar(req, res, next);
    });
  }

  public async obterDiagnostico(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const localidadeId = req.query.localidadeId
        ? Number(req.query.localidadeId)
        : 1;
      const latRaw = req.query.lat ?? req.query.latitude;
      const lonRaw = req.query.lon ?? req.query.longitude;
      const lat = latRaw !== undefined ? Number(latRaw) : undefined;
      const lon = lonRaw !== undefined ? Number(lonRaw) : undefined;
      const usuarioId = req.query.usuarioId ? Number(req.query.usuarioId) : 1;
      const municipio = req.query.municipio
        ? String(req.query.municipio)
        : undefined;
      const uf = req.query.uf ? String(req.query.uf) : 'BA';
      const ibge = req.query.ibge ? String(req.query.ibge) : undefined;

      const diagnostico = await this.service.obterDiagnostico({
        localidadeId,
        lat,
        lon,
        usuarioId,
        municipio,
        uf,
        ibge
      });
      res.status(200).json(diagnostico);
    } catch (error) {
      next(error);
    }
  }

  public async listarAlertasRadar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uf = req.query.uf ? String(req.query.uf) : 'BA';
      const ibge = req.query.ibge ? String(req.query.ibge) : undefined;
      const alertas = await this.radarService.listarAlertas(uf, ibge);
      res.status(200).json({
        uf: uf.toUpperCase(),
        total: alertas.length,
        fonte: 'RadarMeteorológico (https://radarmeteorologico.com.br) / INMET',
        alertas
      });
    } catch (error) {
      next(error);
    }
  }

  public async obterTemperaturasRadar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limite = req.query.limite ? Number(req.query.limite) : 10;
      const ranking = await this.radarService.obterRankingTemperaturas(limite);
      res.status(200).json(ranking);
    } catch (error) {
      next(error);
    }
  }

  public async buscarCidadesRadar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uf = req.query.uf ? String(req.query.uf) : 'BA';
      const q = req.query.q ? String(req.query.q) : undefined;
      const ibge = req.query.ibge ? String(req.query.ibge) : undefined;
      const cidades = await this.radarService.buscarCidades({ uf, q, ibge });
      res.status(200).json(cidades);
    } catch (error) {
      next(error);
    }
  }
}

export const climaController = new ClimaController();
