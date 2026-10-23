import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export enum FIREBASE_COLLECTIONS {
  USUARIOS = 'usuarios',
  ROCAS = 'rocas',
  LOCALIDADES = 'localidades',
  CULTURAS = 'culturas',
  LIMIARES_PLANTIO = 'limiares_plantio',
  PRECIPITACOES = 'precipitacoes',
  RESERVATORIOS = 'reservatorios',
  COMUNIDADE_AVISOS = 'comunidade_avisos',
}

export interface StatusConexaoFirebase {
  provedor: 'Google Firebase (Cloud Firestore)';
  conectadoNuvem: boolean;
  modoOperacao: 'CLOUD_FIRESTORE' | 'MEMORIA_SINCRONIZADA';
  projectId: string | null;
  colecoesAtivas: string[];
  totalDocumentosCache: number;
  ultimaSincronizacao: string | null;
}

export class FirebaseClient {
  private static instance: FirebaseClient;
  private app: App | null = null;
  private firestore: Firestore | null = null;
  private isFirestoreConnected = false;
  private projectId: string | null = null;
  private ultimaSincronizacao: string | null = null;
  private pausadoAteTimestamp = 0;
  private avisoApiDesativadaExibido = false;

  /**
   * Espelho rápido em memória que permite operação 100% transparente
   * mesmo antes de preencher as variáveis FIREBASE_* no .env, e mantém
   * cache sincronizado quando o Cloud Firestore está ativo.
   */
  private memoryMirror: Map<string, Map<string, Record<string, unknown>>> = new Map();

  private constructor() {
    Object.values(FIREBASE_COLLECTIONS).forEach((col) => {
      this.memoryMirror.set(col, new Map());
    });
    this.inicializarConexao();
  }

  public static getInstance(): FirebaseClient {
    if (!FirebaseClient.instance) {
      FirebaseClient.instance = new FirebaseClient();
    }
    return FirebaseClient.instance;
  }

  private inicializarConexao(): void {
    try {
      const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
      const envProjectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
      const envClientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
      const envPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

      let credenciais: {
        projectId?: string;
        clientEmail?: string;
        privateKey?: string;
      } | null = null;

      if (rawJson.startsWith('{')) {
        const parsed = JSON.parse(rawJson);
        credenciais = {
          projectId: parsed.project_id || parsed.projectId,
          clientEmail: parsed.client_email || parsed.clientEmail,
          privateKey: String(parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n'),
        };
      } else if (
        envProjectId &&
        envClientEmail &&
        envPrivateKey &&
        !envPrivateKey.includes('...')
      ) {
        credenciais = {
          projectId: envProjectId,
          clientEmail: envClientEmail,
          privateKey: envPrivateKey.replace(/\\n/g, '\n'),
        };
      }

      if (
        credenciais &&
        credenciais.projectId &&
        credenciais.clientEmail &&
        credenciais.privateKey &&
        credenciais.privateKey.includes('BEGIN PRIVATE KEY')
      ) {
        const existingApps = getApps();
        this.app =
          existingApps.length > 0
            ? existingApps[0]
            : initializeApp({
                credential: cert({
                  projectId: credenciais.projectId,
                  clientEmail: credenciais.clientEmail,
                  privateKey: credenciais.privateKey,
                }),
                projectId: credenciais.projectId,
              });

        this.firestore = getFirestore(this.app);
        this.firestore.settings({ ignoreUndefinedProperties: true });
        this.projectId = credenciais.projectId;
        this.isFirestoreConnected = true;
        this.ultimaSincronizacao = new Date().toISOString();
      } else {
        this.projectId = envProjectId || 'manejo-caatingueiro';
        this.isFirestoreConnected = false;
      }
    } catch (erro) {
      console.warn(
        '[FirebaseClient] Operando em modo de espelhamento em memória (credenciais Cloud Firestore ausentes ou inválidas):',
        erro instanceof Error ? erro.message : String(erro)
      );
      this.isFirestoreConnected = false;
    }
  }

  private obterMapaColecao(colecao: string): Map<string, Record<string, unknown>> {
    if (!this.memoryMirror.has(colecao)) {
      this.memoryMirror.set(colecao, new Map());
    }
    return this.memoryMirror.get(colecao)!;
  }

  public estaConectadoNaNuvem(): boolean {
    return this.isFirestoreConnected && this.firestore !== null && this.pausadoAteTimestamp <= Date.now();
  }

  private tratarErroNuvem(contexto: string, erro: unknown): void {
    const msg = erro instanceof Error ? erro.message : String(erro);
    if (
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Cloud Firestore API has not been used') ||
      msg.includes('NOT_FOUND')
    ) {
      this.pausadoAteTimestamp = Date.now() + 60_000;
      if (!this.avisoApiDesativadaExibido) {
        this.avisoApiDesativadaExibido = true;
        console.warn(
          `[FirebaseClient] Cloud Firestore ainda não ativado no projeto "${this.projectId}". Operando com espelho em memória e tentando reconectar automaticamente a cada 60s. Detalhe: ${msg}`
        );
      }
      return;
    }
    console.warn(`[FirebaseClient] ${contexto}:`, msg);
  }

  public async salvarDocumento<T extends Record<string, unknown>>(
    colecao: FIREBASE_COLLECTIONS | string,
    docId: string | number,
    dados: T
  ): Promise<T> {
    const idNormalizado = String(docId).trim();
    const registroLimpo = JSON.parse(JSON.stringify({
      ...dados,
      _docId: idNormalizado,
      _updatedAt: new Date().toISOString(),
    }));

    const mapa = this.obterMapaColecao(colecao);
    const atual = mapa.get(idNormalizado) || {};
    const mesclado = { ...atual, ...registroLimpo };
    mapa.set(idNormalizado, mesclado);
    this.ultimaSincronizacao = new Date().toISOString();

    if (this.estaConectadoNaNuvem() && this.firestore) {
      try {
        await this.firestore
          .collection(colecao)
          .doc(idNormalizado)
          .set(mesclado, { merge: true });
        this.avisoApiDesativadaExibido = false;
      } catch (erro) {
        this.tratarErroNuvem(
          `Falha ao gravar em ${colecao}/${idNormalizado} no Cloud Firestore (mantido no espelho local)`,
          erro
        );
      }
    }

    return dados;
  }

  public async removerDocumento(
    colecao: FIREBASE_COLLECTIONS | string,
    docId: string | number
  ): Promise<boolean> {
    const idNormalizado = String(docId).trim();
    const mapa = this.obterMapaColecao(colecao);
    const existia = mapa.delete(idNormalizado);
    this.ultimaSincronizacao = new Date().toISOString();

    if (this.estaConectadoNaNuvem() && this.firestore) {
      try {
        await this.firestore.collection(colecao).doc(idNormalizado).delete();
        this.avisoApiDesativadaExibido = false;
      } catch (erro) {
        this.tratarErroNuvem(
          `Falha ao remover ${colecao}/${idNormalizado} no Cloud Firestore`,
          erro
        );
      }
    }

    return existia;
  }

  public async obterDocumento<T = Record<string, unknown>>(
    colecao: FIREBASE_COLLECTIONS | string,
    docId: string | number
  ): Promise<T | null> {
    const idNormalizado = String(docId).trim();
    const mapa = this.obterMapaColecao(colecao);

    if (this.estaConectadoNaNuvem() && this.firestore) {
      try {
        const snap = await this.firestore.collection(colecao).doc(idNormalizado).get();
        this.avisoApiDesativadaExibido = false;
        if (snap.exists) {
          const data = snap.data() as Record<string, unknown>;
          mapa.set(idNormalizado, data);
          return data as T;
        }
      } catch (erro) {
        this.tratarErroNuvem(
          `Falha ao ler ${colecao}/${idNormalizado} do Cloud Firestore (usando cache)`,
          erro
        );
      }
    }

    const local = mapa.get(idNormalizado);
    return local ? (local as T) : null;
  }

  public async listarColecao<T = Record<string, unknown>>(
    colecao: FIREBASE_COLLECTIONS | string
  ): Promise<T[]> {
    const mapa = this.obterMapaColecao(colecao);

    if (this.estaConectadoNaNuvem() && this.firestore) {
      try {
        const snapshot = await this.firestore.collection(colecao).get();
        this.avisoApiDesativadaExibido = false;
        if (!snapshot.empty) {
          snapshot.docs.forEach((docSnap) => {
            mapa.set(docSnap.id, docSnap.data() as Record<string, unknown>);
          });
          this.ultimaSincronizacao = new Date().toISOString();
        }
      } catch (erro) {
        this.tratarErroNuvem(
          `Falha ao listar coleção ${colecao} do Cloud Firestore (usando espelho em memória)`,
          erro
        );
      }
    }

    return Array.from(mapa.values()) as T[];
  }

  public listarColecaoCache<T = Record<string, unknown>>(
    colecao: FIREBASE_COLLECTIONS | string
  ): T[] {
    const mapa = this.obterMapaColecao(colecao);
    return Array.from(mapa.values()) as T[];
  }

  public obterStatusConexao(): StatusConexaoFirebase {
    let totalDocumentosCache = 0;
    this.memoryMirror.forEach((mapa) => {
      totalDocumentosCache += mapa.size;
    });

    return {
      provedor: 'Google Firebase (Cloud Firestore)',
      conectadoNuvem: this.isFirestoreConnected,
      modoOperacao: this.isFirestoreConnected ? 'CLOUD_FIRESTORE' : 'MEMORIA_SINCRONIZADA',
      projectId: this.projectId,
      colecoesAtivas: Object.values(FIREBASE_COLLECTIONS),
      totalDocumentosCache,
      ultimaSincronizacao: this.ultimaSincronizacao,
    };
  }
}

export const firebaseClient = FirebaseClient.getInstance();
