import { Request, Response, NextFunction, Router } from 'express';
import jwt from 'jsonwebtoken';
import { IUsuarioController } from './IUsuarioController.js';
import { UsuarioService, usuarioService } from '../service/UsuarioService.js';
import { jwtService } from '../../../infrastructure/security/JwtService.js';
import { usuarioRepository } from '../repository/UsuarioRepository.js';

export class UsuarioController implements IUsuarioController {
  public readonly router: Router;

  constructor(private readonly service: UsuarioService = usuarioService) {
    this.router = Router();
    this.configurarRotas();
  }

  private configurarRotas(): void {
    this.router.post('/login', (req, res, next) => this.login(req, res, next));
    this.router.get('/me', (req, res, next) => this.obterPerfil(req, res, next));
    this.router.put('/me', (req, res, next) => this.atualizarPerfil(req, res, next));
    this.router.get('/rocas', (req, res, next) => this.listarRocas(req, res, next));
    this.router.post('/rocas', (req, res, next) => this.cadastrarRoca(req, res, next));
    this.router.put('/rocas/:rocaId', (req, res, next) => this.atualizarRoca(req, res, next));
    this.router.delete('/rocas/:rocaId', (req, res, next) => this.removerRoca(req, res, next));
    this.router.post('/', (req, res, next) => this.cadastrar(req, res, next));
    this.router.get('/', (req, res, next) => this.listar(req, res, next));
    this.router.put('/:id', (req, res, next) => this.atualizar(req, res, next));
    this.router.delete('/:id', (req, res, next) => this.remover(req, res, next));
  }

  private extrairUsuarioId(req: Request): number {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const verificado = jwtService.verificarToken(token);
        if (verificado?.id) return Number(verificado.id);
      } catch {
        const decodificado = jwt.decode(token) as { id?: number; email?: string; telefone?: string } | null;
        if (decodificado?.id) return Number(decodificado.id);
        if (decodificado?.email) {
          const porEmail = usuarioRepository.buscarPorEmail(decodificado.email);
          if (porEmail) return porEmail.id;
        }
        if (decodificado?.telefone) {
          const porTel = usuarioRepository.buscarPorTelefone(decodificado.telefone);
          if (porTel) return porTel.id;
        }
      }
    }

    const headerUserId = req.headers['x-usuario-id'];
    if (headerUserId && !Number.isNaN(Number(headerUserId))) {
      return Number(headerUserId);
    }

    if (req.query?.usuarioId && !Number.isNaN(Number(req.query.usuarioId))) {
      return Number(req.query.usuarioId);
    }

    if (req.body?.usuarioId && !Number.isNaN(Number(req.body.usuarioId))) {
      return Number(req.body.usuarioId);
    }

    return 1;
  }

  public login(req: Request, res: Response, next: NextFunction): void {
    try {
      const resultado = this.service.autenticar(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public cadastrar(req: Request, res: Response, next: NextFunction): void {
    try {
      const resultado = this.service.cadastrar(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public listar(_req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarios = this.service.listarTodos();
      res.status(200).json(usuarios);
    } catch (error) {
      next(error);
    }
  }

  public obterPerfil(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const perfil = this.service.obterPerfil(usuarioId);
      res.status(200).json(perfil);
    } catch (error) {
      next(error);
    }
  }

  public atualizarPerfil(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const atualizado = this.service.atualizarPerfil(usuarioId, req.body);
      res.status(200).json({
        ...atualizado,
        usuario: atualizado,
        mensagem: 'Perfil atualizado com sucesso!'
      });
    } catch (error) {
      next(error);
    }
  }

  public listarRocas(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const rocas = this.service.listarRocas(usuarioId);
      res.status(200).json(rocas);
    } catch (error) {
      next(error);
    }
  }

  public cadastrarRoca(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const novaRoca = this.service.cadastrarRoca(usuarioId, req.body);
      const todasRocas = this.service.listarRocas(usuarioId);
      res.status(201).json({
        ...novaRoca,
        roca: novaRoca,
        rocas: todasRocas,
        mensagem: 'Nova roça cadastrada com sucesso!'
      });
    } catch (error) {
      next(error);
    }
  }

  public atualizarRoca(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const rocaId = Number(req.params.rocaId);
      const atualizada = this.service.atualizarRoca(usuarioId, rocaId, req.body);
      const todasRocas = this.service.listarRocas(usuarioId);
      res.status(200).json({
        ...atualizada,
        roca: atualizada,
        rocas: todasRocas,
        mensagem: 'Roça atualizada com sucesso!'
      });
    } catch (error) {
      next(error);
    }
  }

  public removerRoca(req: Request, res: Response, next: NextFunction): void {
    try {
      const usuarioId = this.extrairUsuarioId(req);
      const rocaId = Number(req.params.rocaId);
      const resultado = this.service.removerRoca(usuarioId, rocaId);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  public atualizar(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const atualizado = this.service.atualizar(id, req.body);
      res.status(200).json(atualizado);
    } catch (error) {
      next(error);
    }
  }

  public remover(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const resultado = this.service.remover(id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const usuarioController = new UsuarioController();

