import bcrypt from 'bcryptjs';
import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import { jwtService } from '../../../infrastructure/security/JwtService.js';
import { TipoFonteAgua } from '../enums/TipoFonteAgua.js';
import { TipoPerfil } from '../enums/TipoPerfil.js';
import { RocaUsuario, Usuario } from '../model/Usuario.js';
import {
  AtualizarPerfilRequestDTO,
  CadastroUsuarioRequestDTO,
  RocaRequestDTO
} from '../dto/CadastroUsuarioRequestDTO.js';
import { LoginRequestDTO } from '../dto/LoginRequestDTO.js';
import { LoginResponseDTO, UsuarioResponseDTO } from '../dto/UsuarioResponseDTO.js';
import { IUsuarioRepository } from '../repository/IUsuarioRepository.js';
import { usuarioRepository } from '../repository/UsuarioRepository.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MunicipioRef {
  municipio: string;
  uf: string;
  codigoIbge: string;
  latitude: number;
  longitude: number;
}

const MUNICIPIOS_REFERENCIA: Record<string, MunicipioRef> = {
  'irece': { municipio: 'Irecê', uf: 'BA', codigoIbge: '2914604', latitude: -11.3042, longitude: -41.8558 },
  'irecê': { municipio: 'Irecê', uf: 'BA', codigoIbge: '2914604', latitude: -11.3042, longitude: -41.8558 },
  '2914604': { municipio: 'Irecê', uf: 'BA', codigoIbge: '2914604', latitude: -11.3042, longitude: -41.8558 },
  'presidente dutra': { municipio: 'Presidente Dutra', uf: 'BA', codigoIbge: '2925709', latitude: -11.2958, longitude: -41.9869 },
  '2925709': { municipio: 'Presidente Dutra', uf: 'BA', codigoIbge: '2925709', latitude: -11.2958, longitude: -41.9869 },
  'lapao': { municipio: 'Lapão', uf: 'BA', codigoIbge: '2919157', latitude: -11.3831, longitude: -41.8322 },
  'lapão': { municipio: 'Lapão', uf: 'BA', codigoIbge: '2919157', latitude: -11.3831, longitude: -41.8322 },
  '2919157': { municipio: 'Lapão', uf: 'BA', codigoIbge: '2919157', latitude: -11.3831, longitude: -41.8322 },
  'joao dourado': { municipio: 'João Dourado', uf: 'BA', codigoIbge: '2918357', latitude: -11.3522, longitude: -41.6642 },
  'joão dourado': { municipio: 'João Dourado', uf: 'BA', codigoIbge: '2918357', latitude: -11.3522, longitude: -41.6642 },
  '2918357': { municipio: 'João Dourado', uf: 'BA', codigoIbge: '2918357', latitude: -11.3522, longitude: -41.6642 },
  'sao gabriel': { municipio: 'São Gabriel', uf: 'BA', codigoIbge: '2929255', latitude: -11.2175, longitude: -41.9119 },
  'são gabriel': { municipio: 'São Gabriel', uf: 'BA', codigoIbge: '2929255', latitude: -11.2175, longitude: -41.9119 },
  '2929255': { municipio: 'São Gabriel', uf: 'BA', codigoIbge: '2929255', latitude: -11.2175, longitude: -41.9119 },
  'central': { municipio: 'Central', uf: 'BA', codigoIbge: '2907608', latitude: -11.1358, longitude: -42.1122 },
  '2907608': { municipio: 'Central', uf: 'BA', codigoIbge: '2907608', latitude: -11.1358, longitude: -42.1122 },
  'uibai': { municipio: 'Uibaí', uf: 'BA', codigoIbge: '2932408', latitude: -11.3375, longitude: -42.1328 },
  'uibaí': { municipio: 'Uibaí', uf: 'BA', codigoIbge: '2932408', latitude: -11.3375, longitude: -42.1328 },
  '2932408': { municipio: 'Uibaí', uf: 'BA', codigoIbge: '2932408', latitude: -11.3375, longitude: -42.1328 },
  'jussara': { municipio: 'Jussara', uf: 'BA', codigoIbge: '2918605', latitude: -11.0458, longitude: -41.9669 },
  '2918605': { municipio: 'Jussara', uf: 'BA', codigoIbge: '2918605', latitude: -11.0458, longitude: -41.9669 },
  'america dourada': { municipio: 'América Dourada', uf: 'BA', codigoIbge: '2901155', latitude: -11.4553, longitude: -41.4361 },
  'américa dourada': { municipio: 'América Dourada', uf: 'BA', codigoIbge: '2901155', latitude: -11.4553, longitude: -41.4361 },
  '2901155': { municipio: 'América Dourada', uf: 'BA', codigoIbge: '2901155', latitude: -11.4553, longitude: -41.4361 }
};

function normalizarCulturas(culturas?: string[] | string): string[] {
  if (Array.isArray(culturas)) {
    const limpas = culturas.map((c) => String(c).trim()).filter(Boolean);
    return limpas.length > 0 ? limpas : ['Milho', 'Feijão-Caupi'];
  }
  if (typeof culturas === 'string' && culturas.trim()) {
    const limpas = culturas
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return limpas.length > 0 ? limpas : ['Milho', 'Feijão-Caupi'];
  }
  return ['Milho', 'Feijão-Caupi'];
}

function resolverReferenciaMunicipio(
  municipioOuIbge?: string,
  localidadeId?: number
): MunicipioRef {
  if (municipioOuIbge) {
    const chave = municipioOuIbge.trim().toLowerCase();
    if (MUNICIPIOS_REFERENCIA[chave]) {
      return MUNICIPIOS_REFERENCIA[chave];
    }
  }
  if (Number(localidadeId) === 2 || Number(localidadeId) === 4) {
    return MUNICIPIOS_REFERENCIA['presidente dutra'];
  }
  return MUNICIPIOS_REFERENCIA['irece'];
}

export class UsuarioService {
  constructor(private readonly repository: IUsuarioRepository = usuarioRepository) {}

  private toResponseDTO(usuario: Usuario): UsuarioResponseDTO {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      abastecimento: usuario.abastecimento,
      localidadeId: usuario.localidadeId,
      status: usuario.status,
      emailVerificado: usuario.emailVerificado,
      consentimentoLocalizacao: usuario.consentimentoLocalizacao,
      rocas: usuario.rocas || []
    };
  }

  public autenticar(dto: LoginRequestDTO): LoginResponseDTO {
    const identificadorBruto = (dto.email || dto.identificador || dto.telefone || '').trim();
    const senha = (dto.senha || '').trim();

    if (!identificadorBruto) {
      throw new BusinessException(
        'Informe seu e-mail ou telefone para entrar na conta.',
        400,
        'IDENTIFICADOR_OBRIGATORIO'
      );
    }

    // Se o usuário informou e-mail (ou o campo email foi usado), valida o formato de e-mail
    const pareceEmail = identificadorBruto.includes('@') || Boolean(dto.email);
    if (pareceEmail && !EMAIL_REGEX.test(identificadorBruto)) {
      throw new BusinessException(
        'Formato de e-mail inválido. Verifique o endereço digitado.',
        400,
        'EMAIL_INVALIDO'
      );
    }

    if (!senha || senha.length < 4) {
      throw new BusinessException(
        'A senha informada é inválida ou muito curta.',
        400,
        'SENHA_INVALIDA'
      );
    }

    const usuario = this.repository.buscarPorIdentificador(identificadorBruto);
    if (!usuario) {
      throw new BusinessException(
        'Credenciais inválidas. Usuário não encontrado para o identificador informado.',
        400,
        'CREDENCIAIS_INVALIDAS'
      );
    }

    if (usuario.status === 'Inativo') {
      throw new BusinessException(
        'Esta conta está inativa. Procure a administração ou sindicato rural.',
        403,
        'USUARIO_INATIVO'
      );
    }

    const senhaConfere = bcrypt.compareSync(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new BusinessException(
        'Senha incorreta. Verifique seus dados e tente novamente.',
        400,
        'CREDENCIAIS_INVALIDAS'
      );
    }

    const token = jwtService.gerarToken({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      localidadeId: usuario.localidadeId
    });

    return {
      token,
      tipoToken: 'Bearer',
      usuario: this.toResponseDTO(usuario)
    };
  }

  public cadastrar(dto: CadastroUsuarioRequestDTO): LoginResponseDTO {
    const nome = (dto.nome || '').trim();
    const email = (dto.email || '').trim().toLowerCase();
    const telefone = (dto.telefone || '74999000000').replace(/\D/g, '');
    const senha = (dto.senha || '').trim();

    if (!nome || nome.length < 3) {
      throw new BusinessException(
        'O nome completo ou razão social deve ter pelo menos 3 caracteres.',
        400,
        'NOME_INVALIDO'
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new BusinessException(
        'Informe um endereço de e-mail válido para o cadastro.',
        400,
        'EMAIL_INVALIDO'
      );
    }

    if (!senha || senha.length < 6) {
      throw new BusinessException(
        'A senha deve possuir no mínimo 6 caracteres.',
        400,
        'SENHA_FRACA'
      );
    }

    if (this.repository.buscarPorEmail(email)) {
      throw new BusinessException(
        'Já existe um usuário cadastrado com este endereço de e-mail.',
        400,
        'EMAIL_DUPLICADO'
      );
    }

    const localidadeId = Number(dto.localidadeId) || 1;
    const refMun = resolverReferenciaMunicipio(dto.codigoIbge || dto.municipio, localidadeId);
    const rocaInicial: RocaUsuario = {
      id: 0,
      usuarioId: 0,
      nome: (dto.nomeRoca || '').trim() || `Roça Principal de ${nome.split(' ')[0]}`,
      municipio: (dto.municipio || '').trim() || refMun.municipio,
      uf: ((dto.uf || '').trim() || refMun.uf).toUpperCase(),
      codigoIbge: (dto.codigoIbge || '').trim() || refMun.codigoIbge,
      latitude:
        dto.latitude !== undefined && !Number.isNaN(Number(dto.latitude))
          ? Number(dto.latitude)
          : refMun.latitude,
      longitude:
        dto.longitude !== undefined && !Number.isNaN(Number(dto.longitude))
          ? Number(dto.longitude)
          : refMun.longitude,
      culturas: normalizarCulturas(dto.culturas),
      areaHectares:
        dto.areaHectares !== undefined && !Number.isNaN(Number(dto.areaHectares))
          ? Number(dto.areaHectares)
          : 3.5,
      principal: true
    };

    const senhaHash = bcrypt.hashSync(senha, 8);
    const novoUsuario = this.repository.salvar({
      nome,
      email,
      telefone: telefone || '74999000000',
      senhaHash,
      perfil: dto.perfil || TipoPerfil.AGRICULTOR,
      abastecimento: dto.abastecimento || TipoFonteAgua.CISTERNA,
      localidadeId,
      status: dto.status || 'Ativo',
      emailVerificado: true,
      consentimentoLocalizacao: dto.consentimentoLocalizacao ?? true,
      rocas: [rocaInicial]
    });

    const token = jwtService.gerarToken({
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      telefone: novoUsuario.telefone,
      perfil: novoUsuario.perfil,
      localidadeId: novoUsuario.localidadeId
    });

    return {
      token,
      tipoToken: 'Bearer',
      usuario: this.toResponseDTO(novoUsuario)
    };
  }

  public listarTodos(): UsuarioResponseDTO[] {
    return this.repository.listarTodos().map((u) => this.toResponseDTO(u));
  }

  public buscarPorId(id: number): UsuarioResponseDTO {
    const usuario = this.repository.buscarPorId(id);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
    }
    return this.toResponseDTO(usuario);
  }

  public obterPerfil(usuarioId: number): UsuarioResponseDTO {
    return this.buscarPorId(usuarioId);
  }

  public atualizarPerfil(usuarioId: number, dto: AtualizarPerfilRequestDTO): UsuarioResponseDTO {
    const existente = this.repository.buscarPorId(usuarioId);
    if (!existente) {
      throw new BusinessException('Usuário não encontrado para atualização de perfil.', 404, 'USUARIO_NAO_ENCONTRADO');
    }

    if (dto.email !== undefined && dto.email.trim()) {
      const emailLimpo = dto.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(emailLimpo)) {
        throw new BusinessException('Formato de e-mail inválido.', 400, 'EMAIL_INVALIDO');
      }
      const duplicado = this.repository.buscarPorEmail(emailLimpo);
      if (duplicado && duplicado.id !== usuarioId) {
        throw new BusinessException('Este e-mail já está em uso por outra conta.', 409, 'EMAIL_DUPLICADO');
      }
    }

    if (dto.telefone !== undefined && dto.telefone.trim()) {
      const telLimpo = dto.telefone.replace(/\D/g, '');
      if (telLimpo.length >= 8) {
        const duplicadoTel = this.repository.buscarPorTelefone(telLimpo);
        if (duplicadoTel && duplicadoTel.id !== usuarioId) {
          throw new BusinessException('Este telefone já está vinculado a outra conta.', 409, 'TELEFONE_DUPLICADO');
        }
      }
    }

    const dadosAtualizados: Partial<Usuario> = {};
    if (dto.nome !== undefined && dto.nome.trim().length >= 2) {
      dadosAtualizados.nome = dto.nome.trim();
    }
    if (dto.email !== undefined && dto.email.trim()) {
      dadosAtualizados.email = dto.email.trim().toLowerCase();
    }
    if (dto.telefone !== undefined && dto.telefone.replace(/\D/g, '').length >= 8) {
      dadosAtualizados.telefone = dto.telefone.replace(/\D/g, '');
    }
    if (dto.abastecimento !== undefined) {
      dadosAtualizados.abastecimento = dto.abastecimento;
    }
    if (dto.localidadeId !== undefined && Number(dto.localidadeId) > 0) {
      dadosAtualizados.localidadeId = Number(dto.localidadeId);
    }
    if (dto.consentimentoLocalizacao !== undefined) {
      dadosAtualizados.consentimentoLocalizacao = Boolean(dto.consentimentoLocalizacao);
    }

    const novaSenhaBruta = (dto.novaSenha || dto.senha || '').trim();
    if (novaSenhaBruta) {
      if (novaSenhaBruta.length < 6) {
        throw new BusinessException('A nova senha deve ter no mínimo 6 caracteres.', 400, 'SENHA_FRACA');
      }
      dadosAtualizados.senhaHash = bcrypt.hashSync(novaSenhaBruta, 8);
    }

    const atualizado = this.repository.atualizar(usuarioId, dadosAtualizados);
    if (!atualizado) {
      throw new BusinessException('Não foi possível atualizar o perfil.', 400, 'FALHA_ATUALIZACAO');
    }

    return this.toResponseDTO(atualizado);
  }

  public listarRocas(usuarioId: number): RocaUsuario[] {
    const usuario = this.repository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
    }
    return this.repository.listarRocas(usuarioId);
  }

  public cadastrarRoca(usuarioId: number, dto: RocaRequestDTO): RocaUsuario {
    const usuario = this.repository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
    }

    const nome = (dto.nome || '').trim();
    if (!nome || nome.length < 2) {
      throw new BusinessException(
        'Informe o nome da roça ou propriedade (ex.: Roça Sítio Novo).',
        400,
        'NOME_ROCA_OBRIGATORIO'
      );
    }

    const refMun = resolverReferenciaMunicipio(dto.codigoIbge || dto.municipio, usuario.localidadeId);
    const municipio = (dto.municipio || '').trim() || refMun.municipio;
    const uf = ((dto.uf || '').trim() || refMun.uf).toUpperCase();
    const codigoIbge = (dto.codigoIbge || '').trim() || refMun.codigoIbge;
    const latitude =
      dto.latitude !== undefined && !Number.isNaN(Number(dto.latitude))
        ? Number(dto.latitude)
        : refMun.latitude;
    const longitude =
      dto.longitude !== undefined && !Number.isNaN(Number(dto.longitude))
        ? Number(dto.longitude)
        : refMun.longitude;

    const novaRoca = this.repository.adicionarRoca(usuarioId, {
      nome,
      municipio,
      uf,
      codigoIbge,
      latitude,
      longitude,
      culturas: normalizarCulturas(dto.culturas),
      areaHectares:
        dto.areaHectares !== undefined && !Number.isNaN(Number(dto.areaHectares))
          ? Number(dto.areaHectares)
          : 2.5,
      principal: Boolean(dto.principal)
    });

    if (!novaRoca) {
      throw new BusinessException('Não foi possível cadastrar a roça.', 400, 'FALHA_CADASTRO_ROCA');
    }

    return novaRoca;
  }

  public atualizarRoca(usuarioId: number, rocaId: number, dto: RocaRequestDTO): RocaUsuario {
    const usuario = this.repository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new BusinessException('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
    }

    const dadosParciais: Partial<Omit<RocaUsuario, 'id' | 'usuarioId'>> = {};
    if (dto.nome !== undefined && dto.nome.trim()) {
      dadosParciais.nome = dto.nome.trim();
    }
    if (dto.municipio !== undefined && dto.municipio.trim()) {
      const refMun = resolverReferenciaMunicipio(dto.codigoIbge || dto.municipio, usuario.localidadeId);
      dadosParciais.municipio = dto.municipio.trim();
      if (dto.codigoIbge === undefined) dadosParciais.codigoIbge = refMun.codigoIbge;
      if (dto.latitude === undefined) dadosParciais.latitude = refMun.latitude;
      if (dto.longitude === undefined) dadosParciais.longitude = refMun.longitude;
    }
    if (dto.uf !== undefined && dto.uf.trim()) {
      dadosParciais.uf = dto.uf.trim().toUpperCase();
    }
    if (dto.codigoIbge !== undefined && dto.codigoIbge.trim()) {
      dadosParciais.codigoIbge = dto.codigoIbge.trim();
    }
    if (dto.latitude !== undefined && !Number.isNaN(Number(dto.latitude))) {
      dadosParciais.latitude = Number(dto.latitude);
    }
    if (dto.longitude !== undefined && !Number.isNaN(Number(dto.longitude))) {
      dadosParciais.longitude = Number(dto.longitude);
    }
    if (dto.culturas !== undefined) {
      dadosParciais.culturas = normalizarCulturas(dto.culturas);
    }
    if (dto.areaHectares !== undefined && !Number.isNaN(Number(dto.areaHectares))) {
      dadosParciais.areaHectares = Number(dto.areaHectares);
    }
    if (dto.principal !== undefined) {
      dadosParciais.principal = Boolean(dto.principal);
    }

    const atualizada = this.repository.atualizarRoca(usuarioId, rocaId, dadosParciais);
    if (!atualizada) {
      throw new BusinessException('Roça não encontrada para este agricultor.', 404, 'ROCA_NAO_ENCONTRADA');
    }

    return atualizada;
  }

  public removerRoca(
    usuarioId: number,
    rocaId: number
  ): { id: number; removida: boolean; mensagem: string; rocas: RocaUsuario[] } {
    const resultado = this.repository.removerRoca(usuarioId, rocaId);
    if (!resultado.removida) {
      if (resultado.motivo === 'USUARIO_NAO_ENCONTRADO') {
        throw new BusinessException('Usuário não encontrado.', 404, 'USUARIO_NAO_ENCONTRADO');
      }
      if (resultado.motivo === 'MINIMO_UMA_ROCA') {
        throw new BusinessException(
          'O agricultor deve manter ao menos 1 roça ativa cadastrada.',
          400,
          'MINIMO_UMA_ROCA'
        );
      }
      throw new BusinessException('Roça não encontrada para exclusão.', 404, 'ROCA_NAO_ENCONTRADA');
    }

    return {
      id: rocaId,
      removida: true,
      mensagem: 'Roça removida com sucesso.',
      rocas: resultado.rocasRestantes
    };
  }

  public atualizar(id: number, dto: Partial<CadastroUsuarioRequestDTO>): UsuarioResponseDTO {
    const existente = this.repository.buscarPorId(id);
    if (!existente) {
      throw new BusinessException('Usuário não encontrado para atualização.', 404, 'USUARIO_NAO_ENCONTRADO');
    }

    if (dto.email !== undefined) {
      const emailLimpo = dto.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(emailLimpo)) {
        throw new BusinessException('Formato de e-mail inválido.', 400, 'EMAIL_INVALIDO');
      }
      const duplicado = this.repository.buscarPorEmail(emailLimpo);
      if (duplicado && duplicado.id !== id) {
        throw new BusinessException('Este e-mail já está em uso por outro usuário.', 400, 'EMAIL_DUPLICADO');
      }
    }

    const dadosAtualizados: Partial<Usuario> = {};
    if (dto.nome !== undefined && dto.nome.trim()) dadosAtualizados.nome = dto.nome.trim();
    if (dto.email !== undefined && dto.email.trim()) dadosAtualizados.email = dto.email.trim().toLowerCase();
    if (dto.telefone !== undefined) dadosAtualizados.telefone = dto.telefone.replace(/\D/g, '');
    if (dto.perfil !== undefined) dadosAtualizados.perfil = dto.perfil;
    if (dto.abastecimento !== undefined) dadosAtualizados.abastecimento = dto.abastecimento;
    if (dto.localidadeId !== undefined) dadosAtualizados.localidadeId = Number(dto.localidadeId);
    if (dto.status !== undefined) dadosAtualizados.status = dto.status;
    if (dto.senha && dto.senha.trim().length >= 6) {
      dadosAtualizados.senhaHash = bcrypt.hashSync(dto.senha.trim(), 8);
    }

    const atualizado = this.repository.atualizar(id, dadosAtualizados);
    if (!atualizado) {
      throw new BusinessException('Não foi possível atualizar o usuário.', 400, 'FALHA_ATUALIZACAO');
    }

    return this.toResponseDTO(atualizado);
  }

  public remover(id: number): { id: number; removido: boolean; mensagem: string } {
    const existente = this.repository.buscarPorId(id);
    if (!existente) {
      throw new BusinessException('Usuário não encontrado para exclusão.', 404, 'USUARIO_NAO_ENCONTRADO');
    }

    const removido = this.repository.remover(id);
    return {
      id,
      removido,
      mensagem: `Usuário "${existente.nome}" removido com sucesso.`
    };
  }
}

export const usuarioService = new UsuarioService();

