import bcrypt from 'bcryptjs';
import { RocaUsuario, Usuario } from '../model/Usuario.js';
import { TipoPerfil } from '../enums/TipoPerfil.js';
import { TipoFonteAgua } from '../enums/TipoFonteAgua.js';
import { IUsuarioRepository, NovoUsuarioInput } from './IUsuarioRepository.js';
import {
  firebaseClient,
  FIREBASE_COLLECTIONS
} from '../../../infrastructure/database/FirebaseClient.js';

const senhaPadraoHash = bcrypt.hashSync('Sertao@2026', 8);

function criarRocaPadraoPorLocalidade(
  idRoca: number,
  usuarioId: number,
  localidadeId: number,
  nomePropriedade?: string
): RocaUsuario {
  const isPresidenteDutra = Number(localidadeId) === 2 || Number(localidadeId) === 4;
  return {
    id: idRoca,
    usuarioId,
    nome: nomePropriedade || (isPresidenteDutra ? 'Roça Sítio Caraíbas' : 'Roça Fazenda Baixio'),
    municipio: isPresidenteDutra ? 'Presidente Dutra' : 'Irecê',
    uf: 'BA',
    codigoIbge: isPresidenteDutra ? '2925709' : '2914604',
    latitude: isPresidenteDutra ? -11.2958 : -11.3042,
    longitude: isPresidenteDutra ? -41.9869 : -41.8558,
    culturas: isPresidenteDutra ? ['Mamona', 'Feijão-Caupi'] : ['Milho', 'Feijão-Caupi'],
    areaHectares: 3.5,
    principal: true
  };
}

const USUARIOS_INICIAIS: Usuario[] = [
  {
    id: 1,
    nome: 'João Agricultor',
    email: 'joao@email.com',
    telefone: '74999110001',
    senhaHash: senhaPadraoHash,
    perfil: TipoPerfil.AGRICULTOR,
    abastecimento: TipoFonteAgua.CISTERNA,
    localidadeId: 1,
    status: 'Ativo',
    emailVerificado: true,
    consentimentoLocalizacao: true,
    rocas: [
      {
        id: 1,
        usuarioId: 1,
        nome: 'Roça Fazenda Baixio',
        municipio: 'Irecê',
        uf: 'BA',
        codigoIbge: '2914604',
        latitude: -11.3042,
        longitude: -41.8558,
        culturas: ['Milho', 'Feijão-Caupi'],
        areaHectares: 4.5,
        principal: true
      },
      {
        id: 2,
        usuarioId: 1,
        nome: 'Roça Sítio Caraíbas',
        municipio: 'Presidente Dutra',
        uf: 'BA',
        codigoIbge: '2925709',
        latitude: -11.2958,
        longitude: -41.9869,
        culturas: ['Mamona', 'Feijão-Caupi'],
        areaHectares: 3.0,
        principal: false
      }
    ],
    criadoEm: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 2,
    nome: 'Maria Sertaneja',
    email: 'maria.sertao@email.com',
    telefone: '74999110002',
    senhaHash: senhaPadraoHash,
    perfil: TipoPerfil.AGRICULTOR,
    abastecimento: TipoFonteAgua.POCO,
    localidadeId: 2,
    status: 'Ativo',
    emailVerificado: true,
    consentimentoLocalizacao: true,
    rocas: [
      {
        id: 3,
        usuarioId: 2,
        nome: 'Roça Sítio Lagoa Nova',
        municipio: 'Presidente Dutra',
        uf: 'BA',
        codigoIbge: '2925709',
        latitude: -11.2958,
        longitude: -41.9869,
        culturas: ['Mamona', 'Feijão-Caupi'],
        areaHectares: 3.2,
        principal: true
      }
    ],
    criadoEm: '2026-01-12T09:30:00.000Z'
  },
  {
    id: 3,
    nome: 'Prefeitura de Irecê - Convênio Rural',
    email: 'convenio.agri@irece.ba.gov.br',
    telefone: '7436410003',
    senhaHash: senhaPadraoHash,
    perfil: TipoPerfil.PREFEITURA,
    abastecimento: TipoFonteAgua.MISTO,
    localidadeId: 1,
    status: 'Ativo',
    emailVerificado: true,
    consentimentoLocalizacao: true,
    rocas: [
      {
        id: 4,
        usuarioId: 3,
        nome: 'Campo Experimental Municipal de Irecê',
        municipio: 'Irecê',
        uf: 'BA',
        codigoIbge: '2914604',
        latitude: -11.3042,
        longitude: -41.8558,
        culturas: ['Milho', 'Feijão-Caupi', 'Mamona'],
        areaHectares: 6.0,
        principal: true
      }
    ],
    criadoEm: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 4,
    nome: 'Sindicato dos Trabalhadores Rurais',
    email: 'contato@str-regional.org.br',
    telefone: '7436410004',
    senhaHash: senhaPadraoHash,
    perfil: TipoPerfil.SINDICATO,
    abastecimento: TipoFonteAgua.CISTERNA,
    localidadeId: 1,
    status: 'Ativo',
    emailVerificado: true,
    consentimentoLocalizacao: true,
    rocas: [
      {
        id: 5,
        usuarioId: 4,
        nome: 'Unidade Demonstrativa Sindical',
        municipio: 'Irecê',
        uf: 'BA',
        codigoIbge: '2914604',
        latitude: -11.3042,
        longitude: -41.8558,
        culturas: ['Milho', 'Feijão-Caupi'],
        areaHectares: 5.0,
        principal: true
      }
    ],
    criadoEm: '2026-01-18T11:15:00.000Z'
  },
  {
    id: 5,
    nome: 'Antônio da Palma',
    email: 'antonio.palma@email.com',
    telefone: '74999110005',
    senhaHash: senhaPadraoHash,
    perfil: TipoPerfil.LIDERANCA_COMUNITARIA,
    abastecimento: TipoFonteAgua.CISTERNA,
    localidadeId: 3,
    status: 'Ativo',
    emailVerificado: true,
    consentimentoLocalizacao: true,
    rocas: [
      {
        id: 6,
        usuarioId: 5,
        nome: 'Roça Povoado de Angical',
        municipio: 'Irecê',
        uf: 'BA',
        codigoIbge: '2914604',
        latitude: -11.3042,
        longitude: -41.8558,
        culturas: ['Milho', 'Mamona'],
        areaHectares: 3.8,
        principal: true
      }
    ],
    criadoEm: '2026-01-20T14:20:00.000Z'
  }
];

export class UsuarioRepository implements IUsuarioRepository {
  private usuarios: Usuario[] = USUARIOS_INICIAIS.map((u) => ({
    ...u,
    rocas: u.rocas.map((r) => ({ ...r, culturas: [...r.culturas] }))
  }));

  constructor() {
    void this.inicializarFirebase();
  }

  private async inicializarFirebase(): Promise<void> {
    try {
      const usuariosNuvem = await firebaseClient.listarColecao<Usuario>(
        FIREBASE_COLLECTIONS.USUARIOS
      );
      const rocasNuvem = await firebaseClient.listarColecao<RocaUsuario>(
        FIREBASE_COLLECTIONS.ROCAS
      );

      if (usuariosNuvem && usuariosNuvem.length > 0) {
        const mapaPorId = new Map<number, Usuario>();
        for (const u of this.usuarios) {
          mapaPorId.set(Number(u.id), u);
        }
        for (const uNuvem of usuariosNuvem) {
          if (!uNuvem || !uNuvem.id) continue;
          const idNum = Number(uNuvem.id);
          const rocasDoUsuario =
            rocasNuvem && rocasNuvem.length > 0
              ? rocasNuvem.filter((r) => Number(r.usuarioId) === idNum)
              : [];
          const rocasFinais =
            rocasDoUsuario.length > 0
              ? rocasDoUsuario
              : Array.isArray(uNuvem.rocas) && uNuvem.rocas.length > 0
              ? uNuvem.rocas
              : [criarRocaPadraoPorLocalidade(this.proximoRocaId(), idNum, Number(uNuvem.localidadeId) || 1)];

          mapaPorId.set(idNum, {
            ...uNuvem,
            id: idNum,
            rocas: this.garantirRocaPrincipal(rocasFinais)
          });
        }
        this.usuarios = Array.from(mapaPorId.values()).sort((a, b) => a.id - b.id);
      }

      // Garante que os 5 usuários oficiais e todas as suas roças estejam sincronizados no Firebase
      for (const usuario of this.usuarios) {
        await this.sincronizarUsuarioERocasNoFirebase(usuario);
      }
    } catch (erro) {
      console.warn(
        '[UsuarioRepository] Falha ao sincronizar carga inicial com Firebase:',
        erro instanceof Error ? erro.message : String(erro)
      );
    }
  }

  private async sincronizarUsuarioERocasNoFirebase(usuario: Usuario): Promise<void> {
    await firebaseClient.salvarDocumento(
      FIREBASE_COLLECTIONS.USUARIOS,
      String(usuario.id),
      usuario as unknown as Record<string, unknown>
    );
    for (const roca of usuario.rocas || []) {
      await firebaseClient.salvarDocumento(
        FIREBASE_COLLECTIONS.ROCAS,
        String(roca.id),
        roca as unknown as Record<string, unknown>
      );
    }
  }

  private proximoRocaId(): number {
    let maior = 6;
    for (const u of this.usuarios) {
      for (const r of u.rocas || []) {
        if (r.id > maior) maior = r.id;
      }
    }
    return maior + 1;
  }

  private garantirRocaPrincipal(rocas: RocaUsuario[]): RocaUsuario[] {
    if (!rocas.length) return rocas;
    if (!rocas.some((r) => r.principal)) {
      rocas[0].principal = true;
    }
    return rocas;
  }

  public listarTodos(): Usuario[] {
    return [...this.usuarios].sort((a, b) => a.id - b.id);
  }

  public buscarPorId(id: number): Usuario | undefined {
    const user = this.usuarios.find((u) => u.id === id);
    if (user && (!user.rocas || user.rocas.length === 0)) {
      user.rocas = [criarRocaPadraoPorLocalidade(this.proximoRocaId(), user.id, user.localidadeId)];
    }
    return user;
  }

  public buscarPorEmail(email: string): Usuario | undefined {
    const normalizado = email.trim().toLowerCase();
    return this.usuarios.find((u) => (u.email || '').toLowerCase() === normalizado);
  }

  public buscarPorTelefone(telefone: string): Usuario | undefined {
    const digitos = telefone.replace(/\D/g, '');
    if (!digitos) return undefined;
    return this.usuarios.find((u) => u.telefone.replace(/\D/g, '') === digitos);
  }

  public buscarPorIdentificador(identificador: string): Usuario | undefined {
    const limpo = identificador.trim();
    if (limpo.includes('@')) {
      return this.buscarPorEmail(limpo);
    }
    return this.buscarPorTelefone(limpo) || this.buscarPorEmail(limpo);
  }

  public salvar(dados: NovoUsuarioInput): Usuario {
    const proximoId =
      this.usuarios.reduce((maior, atual) => (atual.id > maior ? atual.id : maior), 0) + 1;

    const rocasIniciais: RocaUsuario[] =
      dados.rocas && dados.rocas.length > 0
        ? dados.rocas.map((r, idx) => ({
            ...r,
            id: r.id || this.proximoRocaId() + idx,
            usuarioId: proximoId,
            principal: idx === 0 ? true : Boolean(r.principal)
          }))
        : [
            criarRocaPadraoPorLocalidade(
              this.proximoRocaId(),
              proximoId,
              dados.localidadeId || 1,
              `Roça de ${dados.nome}`
            )
          ];

    const novo: Usuario = {
      ...dados,
      id: proximoId,
      email: dados.email || `${proximoId}@manejocaatingueiro.org.br`,
      status: dados.status || 'Ativo',
      rocas: this.garantirRocaPrincipal(rocasIniciais),
      criadoEm: dados.criadoEm || new Date().toISOString()
    };
    this.usuarios.push(novo);
    void this.sincronizarUsuarioERocasNoFirebase(novo);
    return novo;
  }

  public criar(dados: NovoUsuarioInput): Usuario {
    return this.salvar(dados);
  }

  public atualizar(id: number, dados: Partial<Usuario>): Usuario | undefined {
    const idx = this.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;

    const atual = this.usuarios[idx];
    const atualizado: Usuario = {
      ...atual,
      ...dados,
      id,
      rocas: dados.rocas ? this.garantirRocaPrincipal(dados.rocas) : atual.rocas
    };
    this.usuarios[idx] = atualizado;
    void this.sincronizarUsuarioERocasNoFirebase(atualizado);
    return atualizado;
  }

  public remover(id: number): boolean {
    const existente = this.usuarios.find((u) => u.id === id);
    const tamanhoAntes = this.usuarios.length;
    this.usuarios = this.usuarios.filter((u) => u.id !== id);
    const removeu = this.usuarios.length < tamanhoAntes;

    if (removeu) {
      void firebaseClient.removerDocumento(FIREBASE_COLLECTIONS.USUARIOS, String(id));
      if (existente && Array.isArray(existente.rocas)) {
        for (const r of existente.rocas) {
          void firebaseClient.removerDocumento(FIREBASE_COLLECTIONS.ROCAS, String(r.id));
        }
      }
    }

    return removeu;
  }

  public listarRocas(usuarioId: number): RocaUsuario[] {
    const usuario = this.buscarPorId(usuarioId);
    if (!usuario) return [];
    return [...usuario.rocas];
  }

  public adicionarRoca(
    usuarioId: number,
    dados: Omit<RocaUsuario, 'id' | 'usuarioId'>
  ): RocaUsuario | undefined {
    const usuario = this.buscarPorId(usuarioId);
    if (!usuario) return undefined;

    const novaId = this.proximoRocaId();
    const deveSerPrincipal = Boolean(dados.principal) || usuario.rocas.length === 0;

    if (deveSerPrincipal) {
      for (const r of usuario.rocas) {
        r.principal = false;
      }
    }

    const novaRoca: RocaUsuario = {
      id: novaId,
      usuarioId: usuario.id,
      nome: dados.nome.trim(),
      municipio: dados.municipio.trim(),
      uf: (dados.uf || 'BA').trim().toUpperCase(),
      codigoIbge: (dados.codigoIbge || '2914604').trim(),
      latitude: Number(dados.latitude),
      longitude: Number(dados.longitude),
      culturas:
        Array.isArray(dados.culturas) && dados.culturas.length > 0 ? dados.culturas : ['Milho'],
      areaHectares: dados.areaHectares !== undefined ? Number(dados.areaHectares) : undefined,
      principal: deveSerPrincipal
    };

    usuario.rocas.push(novaRoca);
    this.garantirRocaPrincipal(usuario.rocas);
    void this.sincronizarUsuarioERocasNoFirebase(usuario);
    return novaRoca;
  }

  public atualizarRoca(
    usuarioId: number,
    rocaId: number,
    dados: Partial<Omit<RocaUsuario, 'id' | 'usuarioId'>>
  ): RocaUsuario | undefined {
    const usuario = this.buscarPorId(usuarioId);
    if (!usuario) return undefined;

    const roca = usuario.rocas.find((r) => r.id === rocaId);
    if (!roca) return undefined;

    if (dados.principal === true) {
      for (const r of usuario.rocas) {
        r.principal = r.id === rocaId;
      }
    } else if (dados.principal === false && roca.principal && usuario.rocas.length > 1) {
      roca.principal = false;
    }

    if (dados.nome !== undefined && dados.nome.trim()) roca.nome = dados.nome.trim();
    if (dados.municipio !== undefined && dados.municipio.trim()) roca.municipio = dados.municipio.trim();
    if (dados.uf !== undefined && dados.uf.trim()) roca.uf = dados.uf.trim().toUpperCase();
    if (dados.codigoIbge !== undefined && dados.codigoIbge.trim()) roca.codigoIbge = dados.codigoIbge.trim();
    if (dados.latitude !== undefined && !Number.isNaN(Number(dados.latitude))) {
      roca.latitude = Number(dados.latitude);
    }
    if (dados.longitude !== undefined && !Number.isNaN(Number(dados.longitude))) {
      roca.longitude = Number(dados.longitude);
    }
    if (dados.culturas !== undefined && Array.isArray(dados.culturas) && dados.culturas.length > 0) {
      roca.culturas = dados.culturas;
    }
    if (dados.areaHectares !== undefined && !Number.isNaN(Number(dados.areaHectares))) {
      roca.areaHectares = Number(dados.areaHectares);
    }

    this.garantirRocaPrincipal(usuario.rocas);
    void this.sincronizarUsuarioERocasNoFirebase(usuario);
    return roca;
  }

  public removerRoca(
    usuarioId: number,
    rocaId: number
  ): { removida: boolean; motivo?: string; rocasRestantes: RocaUsuario[] } {
    const usuario = this.buscarPorId(usuarioId);
    if (!usuario) {
      return { removida: false, motivo: 'USUARIO_NAO_ENCONTRADO', rocasRestantes: [] };
    }
    if (usuario.rocas.length <= 1) {
      return { removida: false, motivo: 'MINIMO_UMA_ROCA', rocasRestantes: [...usuario.rocas] };
    }

    const idx = usuario.rocas.findIndex((r) => r.id === rocaId);
    if (idx === -1) {
      return { removida: false, motivo: 'ROCA_NAO_ENCONTRADA', rocasRestantes: [...usuario.rocas] };
    }

    usuario.rocas.splice(idx, 1);
    this.garantirRocaPrincipal(usuario.rocas);
    void firebaseClient.removerDocumento(FIREBASE_COLLECTIONS.ROCAS, String(rocaId));
    void this.sincronizarUsuarioERocasNoFirebase(usuario);
    return { removida: true, rocasRestantes: [...usuario.rocas] };
  }
}

export const usuarioRepository = new UsuarioRepository();
