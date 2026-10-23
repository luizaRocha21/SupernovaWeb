import { Request, Response, NextFunction, Router } from 'express';

export interface IUsuarioController {
  readonly router: Router;
  login(req: Request, res: Response, next: NextFunction): void;
  cadastrar(req: Request, res: Response, next: NextFunction): void;
  listar(req: Request, res: Response, next: NextFunction): void;
  obterPerfil(req: Request, res: Response, next: NextFunction): void;
  atualizarPerfil(req: Request, res: Response, next: NextFunction): void;
  listarRocas(req: Request, res: Response, next: NextFunction): void;
  cadastrarRoca(req: Request, res: Response, next: NextFunction): void;
  atualizarRoca(req: Request, res: Response, next: NextFunction): void;
  removerRoca(req: Request, res: Response, next: NextFunction): void;
  atualizar(req: Request, res: Response, next: NextFunction): void;
  remover(req: Request, res: Response, next: NextFunction): void;
}

