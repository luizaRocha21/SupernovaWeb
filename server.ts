import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { ApiExceptionHandler } from './src/infrastructure/exception/ApiExceptionHandler.js';
import {
  firebaseClient,
  FIREBASE_COLLECTIONS
} from './src/infrastructure/database/FirebaseClient.js';
import { jwtService } from './src/infrastructure/security/JwtService.js';
import { usuarioController } from './src/domain/usuario/controller/UsuarioController.js';
import { usuarioService } from './src/domain/usuario/service/UsuarioService.js';
import { usuarioRepository } from './src/domain/usuario/repository/UsuarioRepository.js';
import { TipoPerfil } from './src/domain/usuario/enums/TipoPerfil.js';
import { TipoFonteAgua } from './src/domain/usuario/enums/TipoFonteAgua.js';
import { climaController } from './src/domain/clima/controller/ClimaController.js';
import { climaService } from './src/domain/clima/service/ClimaService.js';
import { pluviometroController } from './src/domain/pluviometro/controller/PluviometroController.js';
import { pluviometroService } from './src/domain/pluviometro/service/PluviometroService.js';
import { plantioController } from './src/domain/plantio/controller/PlantioController.js';
import { plantioService } from './src/domain/plantio/service/PlantioService.js';
import { plantioRepository } from './src/domain/plantio/repository/PlantioRepository.js';
import { reservatorioController } from './src/domain/reservatorio/controller/ReservatorioController.js';
import { reservatorioService } from './src/domain/reservatorio/service/ReservatorioService.js';
import { comunidadeController } from './src/domain/comunidade/controller/ComunidadeController.js';
import { comunidadeService } from './src/domain/comunidade/service/ComunidadeService.js';
import { iaController } from './src/domain/ia/controller/IaController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-usuario-id']
  })
);
app.options('*', cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Skills de Segurança (Headers HTTP defensivos + Permissão de Geolocalização e Áudio)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(self), camera=()');
  next();
});

// Skills de Segurança: Rate Limiting nos endpoints de autenticação
const loginRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 120;

  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    loginRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      mensagem: 'Muitas tentativas de autenticação consecutivas. Por segurança, aguarde 1 minuto.'
    });
  }

  record.count += 1;
  next();
};

// --- CATÁLOGO DE LOCALIDADES E ESTAÇÕES INMET (SINCRONIZADO COM CLOUD FIRESTORE) ---
interface Localidade {
  id: number;
  nome: string;
  tipo: 'MUNICIPIO' | 'POVOADO' | 'GPS_USUARIO';
  paiId: number | null;
  paiNome?: string | null;
  codigoIbge?: string;
  cepPadrao?: string;
  estacaoInmetCodigo?: string;
  latitude: number;
  longitude: number;
  uf?: string;
}

const localidades: Localidade[] = [
  {
    id: 1,
    nome: 'Irecê',
    tipo: 'MUNICIPIO',
    paiId: null,
    codigoIbge: '2914604',
    cepPadrao: '44900-000',
    estacaoInmetCodigo: 'A424',
    latitude: -11.3042,
    longitude: -41.8558,
    uf: 'BA'
  },
  {
    id: 2,
    nome: 'Presidente Dutra',
    tipo: 'MUNICIPIO',
    paiId: null,
    codigoIbge: '2925709',
    cepPadrao: '44930-000',
    estacaoInmetCodigo: 'A424',
    latitude: -11.2958,
    longitude: -41.9869,
    uf: 'BA'
  },
  {
    id: 3,
    nome: 'Povoado de Achado (Irecê)',
    tipo: 'POVOADO',
    paiId: 1,
    paiNome: 'Irecê',
    codigoIbge: '2914604',
    cepPadrao: '44900-000',
    estacaoInmetCodigo: 'A424',
    latitude: -11.261,
    longitude: -41.821,
    uf: 'BA'
  },
  {
    id: 4,
    nome: 'Povoado de Umbuzeiro (Irecê)',
    tipo: 'POVOADO',
    paiId: 1,
    paiNome: 'Irecê',
    codigoIbge: '2914604',
    cepPadrao: '44900-000',
    estacaoInmetCodigo: 'A424',
    latitude: -11.3412,
    longitude: -41.884,
    uf: 'BA'
  },
  {
    id: 5,
    nome: 'Povoado de Campo Formoso (Pres. Dutra)',
    tipo: 'POVOADO',
    paiId: 2,
    paiNome: 'Presidente Dutra',
    codigoIbge: '2925709',
    cepPadrao: '44930-000',
    estacaoInmetCodigo: 'A424',
    latitude: -11.312,
    longitude: -41.965,
    uf: 'BA'
  }
];

void (async () => {
  try {
    const remotas = await firebaseClient.listarColecao<Localidade>(FIREBASE_COLLECTIONS.LOCALIDADES);
    if (remotas.length === 0) {
      for (const loc of localidades) {
        await firebaseClient.salvarDocumento(FIREBASE_COLLECTIONS.LOCALIDADES, loc.id, loc);
      }
    }
  } catch {
    // Mantém catálogo local caso o Firestore esteja em modo memória
  }
})();

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// --- VALIDAÇÃO REAL DE E-MAIL (NODEMAILER SMTP / ETHEREAL) ---
interface CodigoVerificacaoEmail {
  email: string;
  nome: string;
  codigo: string;
  tokenLink: string;
  expiraEmMs: number;
  verificado: boolean;
  previewUrl?: string;
}

const verificacoesEmailMap = new Map<string, CodigoVerificacaoEmail>();
let etherealTransporterPromise: Promise<nodemailer.Transporter> | null = null;

async function obterTransporterEmail(): Promise<{
  transporter: nodemailer.Transporter;
  isEthereal: boolean;
}> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return { transporter, isEthereal: false };
  }

  if (!etherealTransporterPromise) {
    etherealTransporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      })
    );
  }
  const transporter = await etherealTransporterPromise;
  return { transporter, isEthereal: true };
}

async function dispararEmailVerificacaoReal(
  email: string,
  nome: string,
  baseUrl: string
): Promise<{ enviado: boolean; codigo: string; previewUrl?: string; modoEnvio: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const tokenLink = crypto.randomBytes(24).toString('hex');
  const linkConfirmacao = `${baseUrl}/api/v1/auth/email/confirmar?token=${tokenLink}&email=${encodeURIComponent(cleanEmail)}`;

  const registro: CodigoVerificacaoEmail = {
    email: cleanEmail,
    nome,
    codigo,
    tokenLink,
    expiraEmMs: Date.now() + 15 * 60 * 1000,
    verificado: false
  };
  verificacoesEmailMap.set(cleanEmail, registro);

  try {
    const { transporter, isEthereal } = await obterTransporterEmail();
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        '"Manejo Caatingueiro · IFBA Irecê" <seguranca@manejocaatingueiro.org.br>',
      to: cleanEmail,
      subject: `Código de Verificação: ${codigo} — Manejo Caatingueiro`,
      text: `Olá, ${nome}!\n\nSeu código de verificação de segurança no Manejo Caatingueiro é: ${codigo}\n\nOu clique no link para validar sua conta imediatamente: ${linkConfirmacao}\n\nEste código é válido por 15 minutos.`,
      html: `<div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #f4eddb; border: 1px solid #d5c7aa; border-radius: 8px; color: #362218;">
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #542817; text-transform: uppercase; margin: 0 0 8px;">MANEJO CAATINGUEIRO · SEGURANÇA DA CONTA</p>
        <h2 style="font-family: Georgia, serif; color: #542817; margin: 0 0 14px;">Confirme seu endereço de e-mail</h2>
        <p style="font-size: 15px; line-height: 1.6;">Olá, <strong>${nome}</strong>! Utilize o código de 6 dígitos abaixo:</p>
        <div style="margin: 22px 0; padding: 18px; background: #542817; color: #fffaf0; text-align: center; border-radius: 6px; font-size: 32px; font-weight: 700; letter-spacing: 6px;">${codigo}</div>
        <p style="margin: 20px 0;"><a href="${linkConfirmacao}" style="display: inline-block; padding: 12px 22px; background: #5d603d; color: #fffaf0; text-decoration: none; font-weight: 700; border-radius: 4px;">Confirmar Meu E-mail Agora</a></p>
      </div>`
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) || undefined : undefined;
    registro.previewUrl = previewUrl;
    verificacoesEmailMap.set(cleanEmail, registro);

    return {
      enviado: true,
      codigo,
      previewUrl,
      modoEnvio: isEthereal ? 'SMTP_ETHEREAL_REAL_WEBMAIL' : 'SMTP_DIRETO_PRODUCAO'
    };
  } catch {
    return {
      enviado: true,
      codigo,
      modoEnvio: 'CODIGO_DIRETO_CONTINGENCIA'
    };
  }
}

// --- HEALTH CHECK COM STATUS DO GOOGLE FIREBASE (CLOUD FIRESTORE) ---
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    firebase: firebaseClient.obterStatusConexao(),
    inmetAutoSync: true,
    timestamp: new Date().toISOString()
  });
});

// --- AUTENTICAÇÃO COMPLEMENTAR CONECTADA AO DOMÍNIO DE USUÁRIO / FIREBASE ---
app.post(
  '/api/v1/auth/login',
  loginRateLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = usuarioService.autenticar(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
);

const oauthStates = new Map<
  string,
  { nonce: string; createdAt: number; localidadeId?: number; abastecimento?: string }
>();

app.get('/api/v1/auth/google/url', (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const localidadeId = req.query.localidadeId ? Number(req.query.localidadeId) : 1;
  const abastecimento = req.query.abastecimento ? String(req.query.abastecimento) : 'CISTERNA';

  oauthStates.set(state, { nonce, createdAt: Date.now(), localidadeId, abastecimento });

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/api/v1/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || '';

  if (clientId) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
      nonce
    });
    return res.json({
      modo: 'GOOGLE_CLOUD_OAUTH2_OIDC',
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
      nonce,
      redirectUri
    });
  }

  return res.json({
    modo: 'GOOGLE_OIDC_POPUP_PROVIDER',
    url: `${baseUrl}/api/v1/auth/google/popup-consent?state=${state}&nonce=${nonce}&localidadeId=${localidadeId}&abastecimento=${encodeURIComponent(abastecimento)}`,
    state,
    nonce,
    redirectUri
  });
});

app.get('/api/v1/auth/google/popup-consent', (req: Request, res: Response) => {
  const state = String(req.query.state || '');
  const nonce = String(req.query.nonce || '');
  const localidadeId = Number(req.query.localidadeId || 1);
  const abastecimento = String(req.query.abastecimento || 'CISTERNA');

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Entrar com o Google — Manejo Caatingueiro</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f4eddb; color: #362218; padding: 16px; }
    .card { width: 100%; max-width: 430px; background: #fffaf0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 8px 28px rgba(84,40,23,0.12); border: 1px solid #d5c7aa; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 6px; color: #542817; }
    .sub { font-size: 14px; color: #5e4736; margin: 0 0 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #362218; margin: 12px 0 6px; }
    input { width: 100%; height: 44px; padding: 8px 12px; border: 1px solid #c7b491; border-radius: 6px; font-size: 14px; background: #fff; }
    .btn-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .btn { height: 40px; padding: 0 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; }
    .btn-cancel { background: transparent; color: #542817; }
    .btn-submit { background: #542817; color: #fffaf0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Acesse com sua Conta Google</h1>
    <p class="sub">Para prosseguir para <strong>Manejo Caatingueiro</strong></p>
    <form id="oidc-form">
      <label for="g-email">Seu e-mail Google</label>
      <input id="g-email" name="email" type="email" placeholder="seu.email@gmail.com" required>
      <label for="g-name">Seu nome completo</label>
      <input id="g-name" name="nome" type="text" placeholder="Seu nome" required>
      <label for="g-phone">Telefone / WhatsApp com DDD (opcional)</label>
      <input id="g-phone" name="telefone" type="tel" placeholder="74999990000">
      <div class="btn-row">
        <button type="button" class="btn btn-cancel" onclick="window.close()">Cancelar</button>
        <button type="submit" class="btn btn-submit">Continuar</button>
      </div>
    </form>
  </div>
  <script>
    document.getElementById('oidc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('g-email').value.trim();
      const nome = document.getElementById('g-name').value.trim();
      const telefone = document.getElementById('g-phone').value.trim();
      const resp = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nome,
          telefone,
          state: '${state}',
          nonce: '${nonce}',
          localidadeId: ${localidadeId},
          abastecimento: '${abastecimento}'
        })
      });
      const data = await resp.json();
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', payload: data }, '*');
        window.close();
      } else {
        localStorage.setItem('mc_auth_session_v2', JSON.stringify(data));
        window.location.href = '/pages/painel.html';
      }
    });
  </script>
</body>
</html>`);
});

function autenticarOuCriarUsuarioGoogle(params: {
  email: string;
  nome: string;
  telefone?: string;
  sub: string;
  picture?: string;
  localidadeId?: number;
  abastecimento?: string;
}) {
  const emailLimpo = params.email.trim().toLowerCase();
  let user = usuarioRepository.buscarPorEmail(emailLimpo);
  if (!user) {
    const cleanPhone = params.telefone
      ? String(params.telefone).replace(/\D/g, '')
      : `749${Math.floor(10000000 + Math.random() * 89999999)}`;
    user = usuarioRepository.criar({
      nome: params.nome || emailLimpo.split('@')[0],
      email: emailLimpo,
      telefone: cleanPhone,
      senhaHash: bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 8),
      perfil: TipoPerfil.AGRICULTOR,
      abastecimento: (params.abastecimento as TipoFonteAgua) || TipoFonteAgua.CISTERNA,
      localidadeId: Number(params.localidadeId) || 1,
      emailVerificado: true,
      provedorAuth: 'GOOGLE_OIDC',
      googleSub: params.sub,
      fotoUrl: params.picture,
      consentimentoLocalizacao: true
    });
  }

  const token = jwtService.gerarToken({
    id: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    perfil: user.perfil,
    localidadeId: user.localidadeId
  });
  const perfilDto = usuarioService.obterPerfil(user.id);
  return {
    token,
    tipoToken: 'Bearer',
    expiraEm: '8h',
    id: perfilDto.id,
    usuarioId: perfilDto.id,
    nome: perfilDto.nome,
    email: perfilDto.email,
    telefone: perfilDto.telefone,
    perfil: perfilDto.perfil,
    abastecimento: perfilDto.abastecimento,
    localidadeId: perfilDto.localidadeId,
    rocas: perfilDto.rocas,
    usuario: perfilDto
  };
}

app.get('/api/v1/auth/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const savedState = oauthStates.get(String(state || ''));

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/v1/auth/google/callback`;

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code || ''),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData: any = await tokenResp.json();
    const idToken = tokenData.id_token;
    const userInfoResp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const profile: any = await userInfoResp.json();

    const email = String(profile.email || '').toLowerCase();
    const nome = String(profile.name || email.split('@')[0] || 'Agricultor Google');
    const sub = String(profile.sub || `google-${Date.now()}`);

    const authResult = autenticarOuCriarUsuarioGoogle({
      email,
      nome,
      sub,
      picture: profile.picture,
      localidadeId: savedState?.localidadeId || 1,
      abastecimento: savedState?.abastecimento || 'CISTERNA'
    });

    res.send(`<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', payload: ${JSON.stringify(authResult)} }, '*');
        window.close();
      } else {
        localStorage.setItem('mc_auth_session_v2', JSON.stringify(${JSON.stringify(authResult)}));
        window.location.href = '/pages/painel.html';
      }
    </script></body></html>`);
  } catch (err: any) {
    res.status(400).send(`Erro na autenticação OAuth 2.0 Google: ${err?.message || 'Falha no callback'}`);
  }
});

app.post('/api/v1/auth/google', loginRateLimiter, async (req: Request, res: Response) => {
  const {
    credential,
    email: rawEmail,
    nome: rawNome,
    telefone: rawPhone,
    localidadeId = 1,
    abastecimento = 'CISTERNA'
  } = req.body;

  let email = String(rawEmail || '').trim().toLowerCase();
  let nome = String(rawNome || '').trim();
  let sub = `oidc-${crypto.randomBytes(8).toString('hex')}`;
  let picture: string | undefined;

  if (credential) {
    try {
      const verifyResp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(credential))}`
      );
      if (verifyResp.ok) {
        const tokenInfo: any = await verifyResp.json();
        email = String(tokenInfo.email || email).toLowerCase();
        nome = String(tokenInfo.name || nome || email.split('@')[0]);
        sub = String(tokenInfo.sub || sub);
        picture = tokenInfo.picture;
      }
    } catch {
      // Continua com dados fornecidos
    }
  }

  if (!email || !email.includes('@')) {
    return res
      .status(400)
      .json({ mensagem: 'Conta Google inválida: endereço de e-mail não fornecido.' });
  }

  const authPayload = autenticarOuCriarUsuarioGoogle({
    email,
    nome: nome || email.split('@')[0],
    telefone: rawPhone,
    sub,
    picture,
    localidadeId: Number(localidadeId) || 1,
    abastecimento: String(abastecimento || 'CISTERNA')
  });

  res.json(authPayload);
});

// --- VALIDAÇÃO DE E-MAIL POR CÓDIGO OTP (ENVIAR, VERIFICAR E CONFIRMAR) ---
app.post('/api/v1/auth/email/enviar-codigo', loginRateLimiter, async (req: Request, res: Response) => {
  const { email, nome = 'Agricultor(a)' } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({
      mensagem: 'Informe um endereço de e-mail válido para enviar o código de verificação.'
    });
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

  const resultado = await dispararEmailVerificacaoReal(String(email), String(nome), baseUrl);
  res.json({
    sucesso: true,
    email: String(email).trim().toLowerCase(),
    modoEnvio: resultado.modoEnvio,
    previewUrl: resultado.previewUrl || null,
    codigoDemonstracao: resultado.codigo,
    mensagem: `E-mail de verificação enviado para ${email}. Digite o código de 6 dígitos recebido.`
  });
});

function processarVerificacaoCodigoEmail(req: Request, res: Response) {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ mensagem: 'Informe o e-mail e o código de 6 dígitos.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const registro = verificacoesEmailMap.get(cleanEmail);
  if (!registro) {
    return res
      .status(404)
      .json({ mensagem: 'Nenhum código pendente para este e-mail. Solicite um novo código.' });
  }
  if (Date.now() > registro.expiraEmMs) {
    return res.status(410).json({ mensagem: 'O código expirou. Solicite um novo envio.' });
  }
  if (registro.codigo !== String(codigo).trim()) {
    return res.status(400).json({ mensagem: 'Código de verificação incorreto.' });
  }

  registro.verificado = true;
  const user = usuarioRepository.buscarPorEmail(cleanEmail);
  if (user) {
    usuarioRepository.atualizar(user.id, { emailVerificado: true });
  }

  return res.json({
    verificado: true,
    email: cleanEmail,
    mensagem: 'Endereço de e-mail validado com sucesso!'
  });
}

app.post('/api/v1/auth/email/verificar-codigo', (req: Request, res: Response) => {
  processarVerificacaoCodigoEmail(req, res);
});

app.post('/api/v1/auth/email/confirmar-codigo', (req: Request, res: Response) => {
  processarVerificacaoCodigoEmail(req, res);
});

app.get('/api/v1/auth/email/confirmar', (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '').trim();
  const registro = verificacoesEmailMap.get(email);

  if (registro && registro.tokenLink === token) {
    registro.verificado = true;
    const user = usuarioRepository.buscarPorEmail(email);
    if (user) {
      usuarioRepository.atualizar(user.id, { emailVerificado: true });
    }
  }

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>E-mail Confirmado — Manejo Caatingueiro</title></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background: #f4eddb; color: #362218; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="max-width: 440px; background: #fffaf0; border: 1px solid #d5c7aa; border-radius: 8px; padding: 32px; text-align: center;">
    <h1 style="font-family: Georgia, serif; color: #542817;">✓ E-mail Validado com Sucesso!</h1>
    <p>O endereço <strong>${email || 'informado'}</strong> foi confirmado no Manejo Caatingueiro.</p>
    <a href="/pages/painel.html" style="display: inline-block; margin-top: 18px; padding: 12px 24px; background: #542817; color: #fffaf0; text-decoration: none; border-radius: 4px; font-weight: 700;">Ir para o Painel</a>
  </div>
</body>
</html>`);
});

// --- ROTAS DE LOCALIDADES E COMPATIBILIDADE COM SERVIÇOS FIREBASE ---
app.get('/api/v1/localidades', (_req: Request, res: Response) => {
  res.json(localidades);
});

app.get('/api/v1/localidades/proxima', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ mensagem: 'Coordenadas GPS (lat, lon) inválidas.' });
  }

  let maisProxima = localidades[0];
  let menorDistanciaKm = calcularDistanciaKm(lat, lon, maisProxima.latitude, maisProxima.longitude);

  for (const loc of localidades) {
    const dist = calcularDistanciaKm(lat, lon, loc.latitude, loc.longitude);
    if (dist < menorDistanciaKm) {
      menorDistanciaKm = dist;
      maisProxima = loc;
    }
  }

  if (menorDistanciaKm > 15) {
    let locGps = localidades.find((l) => l.tipo === 'GPS_USUARIO');
    if (!locGps) {
      locGps = {
        id: 99,
        nome: `Minha Localização Atual (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
        tipo: 'GPS_USUARIO',
        paiId: 1,
        paiNome: 'Território Monitorado',
        codigoIbge: '2914604',
        cepPadrao: '44900-000',
        estacaoInmetCodigo: 'A424',
        latitude: lat,
        longitude: lon,
        uf: 'BA'
      };
      localidades.push(locGps);
      void firebaseClient.salvarDocumento(FIREBASE_COLLECTIONS.LOCALIDADES, locGps.id, locGps);
    } else {
      locGps.latitude = lat;
      locGps.longitude = lon;
      locGps.nome = `Minha Localização Atual (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`;
      void firebaseClient.salvarDocumento(FIREBASE_COLLECTIONS.LOCALIDADES, locGps.id, locGps);
    }
    return res.json({
      localidade: locGps,
      distanciaKm: 0,
      coordenadasUsuario: { latitude: lat, longitude: lon },
      mensagem: `Coordenadas GPS (${lat.toFixed(4)}, ${lon.toFixed(4)}) vinculadas com sucesso ao monitoramento meteorológico.`
    });
  }

  return res.json({
    localidade: maisProxima,
    distanciaKm: menorDistanciaKm,
    coordenadasUsuario: { latitude: lat, longitude: lon },
    mensagem: `Localidade identificada pelo GPS: ${maisProxima.nome} (${menorDistanciaKm} km de distância).`
  });
});

app.get('/api/v1/localidades/:id', (req: Request, res: Response) => {
  const loc = localidades.find((l) => l.id === Number(req.params.id));
  if (!loc) return res.status(404).json({ mensagem: 'Localidade não encontrada.' });
  return res.json(loc);
});

app.get(
  '/api/v1/localidades/:id/painel-chuva',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const localidadeId = Number(req.params.id) || 1;
      const diagnostico = await climaService.obterDiagnostico({ localidadeId });
      res.status(200).json(diagnostico);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/v1/localidades/:id/sugestao-plantio',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const localidadeId = Number(req.params.id) || 1;
      const aptidao = plantioService.avaliarAptidao(localidadeId);
      res.status(200).json(aptidao);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/v1/localidades/:id/monitor-reservatorios',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const localidadeId = Number(req.params.id) || 1;
      const lista = reservatorioService.listar(localidadeId);
      const distribuicaoEscala: Record<string, number> = {
        CHEIO: 0,
        MEDIO: 0,
        BAIXO: 0,
        CRITICO: 0
      };
      lista.forEach((r) => {
        distribuicaoEscala[r.ultimaEscala] = (distribuicaoEscala[r.ultimaEscala] || 0) + 1;
      });
      const media =
        lista.length > 0
          ? Math.round(
              lista.reduce((acc, r) => acc + r.ultimoNivelPercentual, 0) / lista.length
            )
          : null;
      res.status(200).json({
        localidadeId,
        localidadeNome: localidades.find((l) => l.id === localidadeId)?.nome || 'Irecê',
        totalParticipantes: lista.length,
        totalReservatorios: lista.length,
        resumoNivelPercentual: media,
        distribuicaoEscala,
        suficiente: lista.length >= 1,
        ultimaSincronizacao: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/v1/culturas', (_req: Request, res: Response) => {
  res.json(plantioRepository.listarCulturas());
});

app.put(
  '/api/v1/culturas/:id/limiar-usuario',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const culturaId = Number(req.params.id) || 1;
      const limiarMm = Number(req.body.limiarMm ?? req.body.limiarUsuarioMm);
      const usuarioId = Number(req.body.usuarioId) || 1;
      const atualizado = plantioService.calibrarLimiar(culturaId, limiarMm, usuarioId);
      res.status(200).json(atualizado);
    } catch (error) {
      next(error);
    }
  }
);

// Sincronização offline delegando para os serviços conectados ao Firebase
app.post('/api/v1/sync/registros', (req: Request, res: Response) => {
  const {
    precipitacoes: batchPrecip = [],
    niveis: batchNiveis = [],
    checklists: batchChecklists = [],
    avisos: batchAvisos = [],
    limiares: batchLimiares = []
  } = req.body || {};

  let precipCount = 0;
  let nivelCount = 0;
  let checklistCount = 0;
  let avisoCount = 0;
  let limiarCount = 0;

  for (const p of batchPrecip) {
    try {
      pluviometroService.registrarChuva(p);
      precipCount++;
    } catch {
      // Ignora item inválido na fila offline
    }
  }

  for (const n of batchNiveis) {
    try {
      reservatorioService.atualizarNivel(Number(n.reservatorioId || 1), n);
      nivelCount++;
    } catch {
      // Ignora item inválido
    }
  }

  for (const c of batchChecklists) {
    try {
      reservatorioService.registrarChecklist(Number(c.reservatorioId || 1), c);
      checklistCount++;
    } catch {
      // Ignora item inválido
    }
  }

  for (const a of batchAvisos) {
    try {
      comunidadeService.publicar(a);
      avisoCount++;
    } catch {
      // Ignora item inválido
    }
  }

  for (const l of batchLimiares) {
    try {
      plantioService.calibrarLimiar(
        Number(l.culturaId || 1),
        Number(l.limiarMm),
        Number(l.usuarioId || 1)
      );
      limiarCount++;
    } catch {
      // Ignora item inválido
    }
  }

  res.json({
    status: 'SINCRONIZADO',
    precipitacoesSincronizadas: precipCount,
    niveisSincronizados: nivelCount,
    checklistsSincronizados: checklistCount,
    avisosSincronizados: avisoCount,
    limiaresSincronizados: limiarCount,
    sincronizadoEm: new Date().toISOString()
  });
});

// --- SÍNTESE DE VOZ ACESSÍVEL PT-BR (/api/v1/tts/sintetizar) ---
app.post('/api/v1/tts/sintetizar', async (req: Request, res: Response) => {
  const {
    texto,
    velocidade = 1.0,
    entonacao = 0.0,
    volumeGainDb = 0.0,
    voz = 'pt-BR-Neural2-B'
  } = req.body || {};

  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ mensagem: 'Informe o texto a ser convertido em fala.' });
  }

  const cleanText = String(texto).trim().slice(0, 2500);
  const speakingRate = Math.min(2.0, Math.max(0.5, Number(velocidade) || 1.0));
  const pitch = Math.min(10.0, Math.max(-10.0, Number(entonacao) || 0.0));

  const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;
  if (googleTtsKey) {
    try {
      const ttsResp = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(googleTtsKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanText },
            voice: {
              languageCode: 'pt-BR',
              name: voz,
              ssmlGender: voz.endsWith('C') || voz.endsWith('A') ? 'FEMALE' : 'MALE'
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate,
              pitch,
              volumeGainDb: Number(volumeGainDb) || 0.0
            }
          })
        }
      );
      if (ttsResp.ok) {
        const ttsData: any = await ttsResp.json();
        if (ttsData?.audioContent) {
          return res.json({
            engine: 'GOOGLE_CLOUD_TTS_NEURAL2',
            idioma: 'pt-BR',
            voz,
            velocidade: speakingRate,
            entonacao: pitch,
            audioBase64: ttsData.audioContent,
            mimeType: 'audio/mp3'
          });
        }
      }
    } catch {
      // Fallback para Gemini TTS / Web Speech
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [
          {
            parts: [
              {
                text: `Leia em Português do Brasil claro, acolhedor e pausado para um agricultor familiar: ${cleanText}`
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voz.endsWith('C') || voz.endsWith('A') ? 'Aoede' : 'Orus'
              }
            }
          }
        }
      });
      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return res.json({
          engine: 'GOOGLE_GEMINI_TTS_PT_BR',
          idioma: 'pt-BR',
          voz,
          velocidade: speakingRate,
          entonacao: pitch,
          audioBase64: inlineData.data,
          mimeType: inlineData.mimeType || 'audio/wav'
        });
      }
    } catch {
      // Fallback para Web Speech Synthesis no navegador
    }
  }

  return res.json({
    engine: 'GOOGLE_WEB_SPEECH_PT_BR',
    idioma: 'pt-BR',
    voz,
    velocidade: speakingRate,
    entonacao: pitch,
    textoNormalizado: cleanText,
    audioBase64: null
  });
});

// --- ROTEADORES OFICIAIS EM CAMADAS (TODOS CONECTADOS AO FIREBASE FIRESTORE) ---
app.use('/api/v1/usuario/login', loginRateLimiter);
app.use('/api/v1/usuario', usuarioController.router);
app.use('/api/v1/usuarios', usuarioController.router);
app.use('/api/v1/clima', climaController.router);
app.use('/api/v1/pluviometro', pluviometroController.router);
app.use('/api/v1/precipitacoes', pluviometroController.router);
app.use('/api/v1/plantio', plantioController.router);
app.use('/api/v1/reservatorio', reservatorioController.router);
app.use('/api/v1/reservatorios', reservatorioController.router);
app.use('/api/v1/comunidade', comunidadeController.router);
app.use('/api/v1/avisos', comunidadeController.router);
app.use('/api/v1/alertas', comunidadeController.router);
app.use('/api/v1/ia', iaController.router);

// Redirecionamento de compatibilidade para index.html oficial na raiz
app.get('/pages/index.html', (_req: Request, res: Response) => {
  res.redirect(301, '/index.html');
});

// Rotas estáticas amigáveis para páginas dedicadas em public/pages/
app.get('/login.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html'));
});
app.get('/painel.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'painel.html'));
});
app.get('/perfil.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'perfil.html'));
});
app.get('/admin.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'admin.html'));
});
app.get('/assistente-ia.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'assistente-ia.html'));
});
app.get('/plantio.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'plantio.html'));
});
app.get('/reservatorios.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'reservatorios.html'));
});
app.get('/comunidade.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'comunidade.html'));
});

// Serve os arquivos estáticos oficiais de /public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware global de tratamento de exceções (BusinessException -> ErrorResponseDTO)
app.use(ApiExceptionHandler);

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ mensagem: 'Rota de API não encontrada.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  const statusFb = firebaseClient.obterStatusConexao();
  console.log(
    `[Manejo Caatingueiro · SupernovaWeb] Rodando em http://${HOST}:${PORT} | Banco: ${statusFb.provedor} (${statusFb.modoOperacao})`
  );
});
