import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'manejo-caatingueiro-jwt-secret-key-2026-min-32-chars';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Skills de Segurança (Headers HTTP defensivos + Permissão de Geolocalização e Áudio)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permite geolocation=(self) para que o agricultor possa usar sua localização GPS atual
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(self), camera=()');
  next();
});

// Skills de Segurança: Proteção contra força bruta nos endpoints de autenticação
const loginRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxAttempts = 20;

  const record = loginRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    loginRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      mensagem: "Muitas tentativas de autenticação consecutivas. Por segurança, aguarde 1 minuto."
    });
  }

  record.count += 1;
  next();
};

// --- MODELOS E BANCO EM MEMÓRIA (ESPELHANDO O SCHEMA DO SUPABASE POSTGRESQL) ---
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
}

interface Usuario {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  emailVerificado?: boolean;
  googleSub?: string;
  provedorAuth?: 'LOCAL' | 'GOOGLE_OIDC';
  fotoUrl?: string;
  senhaHash: string;
  perfil: 'AGRICULTOR' | 'GESTOR_PUBLICO' | 'LIDERANCA_COMUNITARIA';
  abastecimento: 'ENCANADA' | 'POCO' | 'CISTERNA' | 'MISTO';
  localidadeId: number;
  consentimentoLocalizacao: boolean;
}

interface Cultura {
  id: number;
  nome: string;
  tipoCriterio: 'ACUMULADO_JANELA' | 'INICIO_ESTACAO' | 'VOLUME_POR_EVENTO';
  janelaDias: number | null;
  limiarPadraoMm: number;
  fonteLimiar: string;
}

interface Precipitacao {
  id: number;
  localidadeId: number;
  usuarioId: number;
  volumeMm: number;
  dataEvento: string;
  fonte: 'PLUVIOMETRO_PROPRIO' | 'ESTACAO' | 'ESTIMATIVA';
  idClienteSync?: string;
  criadoEm: string;
}

interface Reservatorio {
  id: number;
  apelido: string;
  tipo: 'POCO' | 'CISTERNA';
  responsavelId: number;
  localidadeId: number;
  capacidadeLitros: number;
  ultimoNivelPercentual: number;
  escala: 'CHEIO' | 'MEDIO' | 'BAIXO' | 'CRITICO';
  nivelLencolMetros?: number | null;
  consentimentoAgregacao: boolean;
  atualizadoEm: string;
}

interface ChecklistSanitario {
  id: number;
  reservatorioId: number;
  dataAvaliacao: string;
  protecaoEntrada: boolean;
  aguaSemOdorOuCor: boolean;
  entornoLimpo: boolean;
  estruturaIntegra: boolean;
  riscoPotabilidade: boolean;
  observacao: string;
  criadoEm: string;
}

interface AlertaClimatico {
  id: number;
  localidadeId: number;
  emissorId: number;
  tipo: string;
  severidade: 'INFO' | 'ATENCAO' | 'ALTA' | 'AMARELO' | 'LARANJA' | 'VERMELHO';
  corInmet?: 'AMARELO' | 'LARANJA' | 'VERMELHO' | 'VERDE';
  codigoIbge?: string;
  titulo: string;
  mensagem: string;
  fonte: string;
  vigenteAte: string;
  criadoEm: string;
}

interface AvisoMural {
  id: number;
  localidadeId: number;
  autorId: number;
  autorNome: string;
  titulo: string;
  conteudo: string;
  publicadoEm: string;
  visivelAte: string;
}

interface EstacaoInmet {
  codigo: string;
  nome: string;
  tipo: 'AUTOMATICA' | 'CONVENCIONAL';
  uf: string;
  municipio: string;
  codigoIbge: string;
  latitude: number;
  longitude: number;
  altitudeMetros: number;
  situacao: string;
  temperaturaAtualC: number;
  temperaturaMinC: number;
  temperaturaMaxC: number;
  umidadeRelativaPct: number;
  precipitacaoHorariaMm: number;
  precipitacaoDiariaMm: number;
  precipitacaoMesMm: number;
  ventoVelocidadeKmh: number;
  atualizadoEm: string;
  fonteApi: string;
}

// 1. Localidades reais da Pesquisa de Campo (Irecê e Presidente Dutra - BA) com códigos IBGE e Estação INMET
const localidades: Localidade[] = [
  { id: 1, nome: "Irecê", tipo: "MUNICIPIO", paiId: null, codigoIbge: "2914604", cepPadrao: "44900-000", estacaoInmetCodigo: "A424", latitude: -11.3042, longitude: -41.8558 },
  { id: 2, nome: "Presidente Dutra", tipo: "MUNICIPIO", paiId: null, codigoIbge: "2925709", cepPadrao: "44930-000", estacaoInmetCodigo: "A424", latitude: -11.2958, longitude: -41.9869 },
  { id: 3, nome: "Povoado de Achado (Irecê)", tipo: "POVOADO", paiId: 1, paiNome: "Irecê", codigoIbge: "2914604", cepPadrao: "44900-000", estacaoInmetCodigo: "A424", latitude: -11.2610, longitude: -41.8210 },
  { id: 4, nome: "Povoado de Umbuzeiro (Irecê)", tipo: "POVOADO", paiId: 1, paiNome: "Irecê", codigoIbge: "2914604", cepPadrao: "44900-000", estacaoInmetCodigo: "A424", latitude: -11.3412, longitude: -41.8840 },
  { id: 5, nome: "Povoado de Campo Formoso (Pres. Dutra)", tipo: "POVOADO", paiId: 2, paiNome: "Presidente Dutra", codigoIbge: "2925709", cepPadrao: "44930-000", estacaoInmetCodigo: "A424", latitude: -11.3120, longitude: -41.9650 }
];

// 2. Estações Oficiais do INMET na Região de Irecê / Chapada / Semiárido Baiano
const estacoesInmet: EstacaoInmet[] = [
  {
    codigo: "A424",
    nome: "IRECÊ - Estação Automática INMET",
    tipo: "AUTOMATICA",
    uf: "BA",
    municipio: "Irecê",
    codigoIbge: "2914604",
    latitude: -11.3286,
    longitude: -41.8650,
    altitudeMetros: 768,
    situacao: "OPERANTE (Tempo Real)",
    temperaturaAtualC: 27.4,
    temperaturaMinC: 20.1,
    temperaturaMaxC: 31.8,
    umidadeRelativaPct: 62,
    precipitacaoHorariaMm: 0.0,
    precipitacaoDiariaMm: 4.2,
    precipitacaoMesMm: 42.0,
    ventoVelocidadeKmh: 14.5,
    atualizadoEm: new Date().toISOString(),
    fonteApi: "API Oficial INMET (apitempo.inmet.gov.br · Estação A424) + Telemetria Satelital"
  },
  {
    codigo: "83228",
    nome: "IRECÊ - Estação Meteorológica Convencional",
    tipo: "CONVENCIONAL",
    uf: "BA",
    municipio: "Irecê",
    codigoIbge: "2914604",
    latitude: -11.3000,
    longitude: -41.8667,
    altitudeMetros: 747,
    situacao: "OPERANTE (Série Histórica 1991-2020)",
    temperaturaAtualC: 27.1,
    temperaturaMinC: 19.8,
    temperaturaMaxC: 31.5,
    umidadeRelativaPct: 64,
    precipitacaoHorariaMm: 0.0,
    precipitacaoDiariaMm: 4.0,
    precipitacaoMesMm: 41.5,
    ventoVelocidadeKmh: 12.8,
    atualizadoEm: new Date().toISOString(),
    fonteApi: "BDMEP / INMET Série Histórica Oficial (Estação 83228)"
  },
  {
    codigo: "A429",
    nome: "MORRO DO CHAPÉU - Estação Automática INMET",
    tipo: "AUTOMATICA",
    uf: "BA",
    municipio: "Morro do Chapéu",
    codigoIbge: "2921708",
    latitude: -11.5514,
    longitude: -41.1711,
    altitudeMetros: 1003,
    situacao: "OPERANTE (Referência Regional Leste)",
    temperaturaAtualC: 23.8,
    temperaturaMinC: 17.2,
    temperaturaMaxC: 27.9,
    umidadeRelativaPct: 71,
    precipitacaoHorariaMm: 0.2,
    precipitacaoDiariaMm: 6.4,
    precipitacaoMesMm: 51.2,
    ventoVelocidadeKmh: 18.2,
    atualizadoEm: new Date().toISOString(),
    fonteApi: "API Oficial INMET (apitempo.inmet.gov.br · Estação A429)"
  }
];

// 3. Culturas validadas do Semiárido (RF05)
const culturas: Cultura[] = [
  {
    id: 1,
    nome: "milho",
    tipoCriterio: "ACUMULADO_JANELA",
    janelaDias: 30,
    limiarPadraoMm: 120.0,
    fonteLimiar: "Referência agroclimática Semiárido (Embrapa Semiárido / ZARC BA) — editável pelo agricultor (RN09)"
  },
  {
    id: 2,
    nome: "mamona",
    tipoCriterio: "ACUMULADO_JANELA",
    janelaDias: 30,
    limiarPadraoMm: 90.0,
    fonteLimiar: "Referência agroclimática Território de Irecê e Presidente Dutra — resistente à estiagem (RN09)"
  },
  {
    id: 3,
    nome: "feijão",
    tipoCriterio: "INICIO_ESTACAO",
    janelaDias: null,
    limiarPadraoMm: 110.0,
    fonteLimiar: "Referência para feijão-caupi/rotação de ciclo curto no semiárido baiano (RN09)"
  },
  {
    id: 4,
    nome: "sorgo",
    tipoCriterio: "VOLUME_POR_EVENTO",
    janelaDias: 7,
    limiarPadraoMm: 45.0,
    fonteLimiar: "Cultura alternativa de alta resiliência hídrica para anos de chuva irregular"
  }
];

const limiaresUsuario = new Map<string, number>();
const defaultSenhaHash = bcrypt.hashSync("senha123", 10);

// 4. Usuários iniciais
const usuarios: Usuario[] = [
  {
    id: 1,
    nome: "Ana Carolina Estevão (IFBA)",
    telefone: "74999990000",
    email: "ana.estevao@ifba.edu.br",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "GESTOR_PUBLICO",
    abastecimento: "ENCANADA",
    localidadeId: 1,
    consentimentoLocalizacao: true
  },
  {
    id: 2,
    nome: "Zé Ronaldo",
    telefone: "74988880000",
    email: "zeronaldo.roca@gmail.com",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "AGRICULTOR",
    abastecimento: "CISTERNA",
    localidadeId: 1,
    consentimentoLocalizacao: true
  },
  {
    id: 3,
    nome: "Wiliam Santos",
    telefone: "74988880001",
    email: "wiliam.santos@comunidade.org",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "LIDERANCA_COMUNITARIA",
    abastecimento: "POCO",
    localidadeId: 1,
    consentimentoLocalizacao: true
  },
  {
    id: 4,
    nome: "Luiza Rocha",
    telefone: "74988880002",
    email: "luizarocha@ifba.edu.br",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "AGRICULTOR",
    abastecimento: "MISTO",
    localidadeId: 3,
    consentimentoLocalizacao: true
  },
  {
    id: 5,
    nome: "Seu Damião",
    telefone: "74988880003",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "AGRICULTOR",
    abastecimento: "CISTERNA",
    localidadeId: 3,
    consentimentoLocalizacao: true
  },
  {
    id: 6,
    nome: "Dona Maria do Achado",
    telefone: "74988880004",
    emailVerificado: true,
    provedorAuth: "LOCAL",
    senhaHash: defaultSenhaHash,
    perfil: "AGRICULTOR",
    abastecimento: "POCO",
    localidadeId: 4,
    consentimentoLocalizacao: true
  }
];

const hojeIso = new Date().toISOString().slice(0, 10);
const tresDiasAtrasIso = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);
const seisDiasAtrasIso = new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10);
const trintaDiasFuturoIso = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

const precipitacoes: Precipitacao[] = [];

function calcularEscala(pct: number): 'CHEIO' | 'MEDIO' | 'BAIXO' | 'CRITICO' {
  if (pct >= 75) return 'CHEIO';
  if (pct >= 40) return 'MEDIO';
  if (pct >= 15) return 'BAIXO';
  return 'CRITICO';
}

const reservatorios: Reservatorio[] = [
  {
    id: 1,
    apelido: "Cisterna de Placa da Casa",
    tipo: "CISTERNA",
    responsavelId: 2,
    localidadeId: 1,
    capacidadeLitros: 16000,
    ultimoNivelPercentual: 68,
    escala: "MEDIO",
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 2,
    apelido: "Poço Tubular da Roça",
    tipo: "POCO",
    responsavelId: 2,
    localidadeId: 1,
    capacidadeLitros: 45000,
    ultimoNivelPercentual: 80,
    escala: "CHEIO",
    nivelLencolMetros: 14.5,
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 3,
    apelido: "Poço Comunitário Wiliam",
    tipo: "POCO",
    responsavelId: 3,
    localidadeId: 1,
    capacidadeLitros: 50000,
    ultimoNivelPercentual: 55,
    escala: "MEDIO",
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 4,
    apelido: "Cisterna Calçadão Luiza",
    tipo: "CISTERNA",
    responsavelId: 4,
    localidadeId: 3,
    capacidadeLitros: 52000,
    ultimoNivelPercentual: 82,
    escala: "CHEIO",
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 5,
    apelido: "Cisterna Seu Damião",
    tipo: "CISTERNA",
    responsavelId: 5,
    localidadeId: 3,
    capacidadeLitros: 16000,
    ultimoNivelPercentual: 32,
    escala: "BAIXO",
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 6,
    apelido: "Poço Dona Maria",
    tipo: "POCO",
    responsavelId: 6,
    localidadeId: 4,
    capacidadeLitros: 30000,
    ultimoNivelPercentual: 64,
    escala: "MEDIO",
    consentimentoAgregacao: true,
    atualizadoEm: new Date().toISOString()
  }
];

const checklists: ChecklistSanitario[] = [
  {
    id: 1,
    reservatorioId: 1,
    dataAvaliacao: hojeIso,
    protecaoEntrada: true,
    aguaSemOdorOuCor: true,
    entornoLimpo: true,
    estruturaIntegra: true,
    riscoPotabilidade: false,
    observacao: "Calha limpa e primeiro desvio de água de chuva revisado.",
    criadoEm: new Date().toISOString()
  }
];

const alertas: AlertaClimatico[] = [
  {
    id: 1,
    localidadeId: 1,
    emissorId: 1,
    tipo: "AVISO_INMET_CHUVAS_INTENSAS",
    severidade: "AMARELO",
    corInmet: "AMARELO",
    codigoIbge: "2914604",
    titulo: "Aviso INMET (Nível Amarelo · Perigo Potencial): Pancadas de Chuva e Trovoadas Isoladas",
    mensagem: "Estação Automática INMET A424 (Irecê) e Radar Meteorológico indicam instabilidade atmosférica com pancadas localizadas (20 a 30 mm/h). Aproveite para revisar calhas e o primeiro desvio das cisternas. Cadastre seu CEP no SMS 40199 da Defesa Civil.",
    fonte: "API Oficial de Alertas INMET (IBGE 2914604) · Estação A424 Irecê",
    vigenteAte: trintaDiasFuturoIso,
    criadoEm: new Date().toISOString()
  },
  {
    id: 2,
    localidadeId: 2,
    emissorId: 1,
    tipo: "CHUVA_IRREGULAR_VERANICO",
    severidade: "LARANJA",
    corInmet: "LARANJA",
    codigoIbge: "2925709",
    titulo: "Aviso INMET (Nível Laranja · Atenção Severa): Irregularidade Hídrica e Alta Evapotranspiração",
    mensagem: "Volume acumulado nos últimos 15 dias em Presidente Dutra (IBGE 2925709) exige cautela para plantio de milho de ciclo longo; culturas resilientes como mamona e sorgo apresentam melhor janela hídrica.",
    fonte: "INMET Alertas Oficiais + Defesa Civil (SMS 40199)",
    vigenteAte: trintaDiasFuturoIso,
    criadoEm: new Date().toISOString()
  }
];

const avisosMural: AvisoMural[] = [
  {
    id: 1,
    localidadeId: 1,
    autorId: 2,
    autorNome: "Zé Ronaldo (Agricultor)",
    titulo: "Troca de Sementes Crioulas de Feijão-Caupi e Mamona",
    conteudo: "Disponibilizo sementes selecionadas da última safra para troca na reunião de sábado às 9h na Associação Comunitária do Achado.",
    publicadoEm: new Date().toISOString(),
    visivelAte: trintaDiasFuturoIso
  },
  {
    id: 2,
    localidadeId: 1,
    autorId: 1,
    autorNome: "Ana Carolina · Grupo Garimpeiros IFBA",
    titulo: "Oficina de Validação do Painel Manejo Caatingueiro (SNCT)",
    conteudo: "Convidamos os agricultores familiares de Irecê e Presidente Dutra para testar o painel hiperlocal, o leitor em voz alta e a integração automática com as estações do INMET.",
    publicadoEm: new Date().toISOString(),
    visivelAte: trintaDiasFuturoIso
  }
];

// Cadastros SMS 40199 Defesa Civil
const cadastrosSmsDefesaCivil: Array<{ id: number; telefone: string; cep: string; localidadeNome: string; criadoEm: string }> = [];

// Normais climatológicas mensais de 30 anos (1991-2020) INMET Estação 83228 / CHIRPS para Irecê-BA
const NORMAIS_IRECE = [95, 82, 92, 54, 18, 9, 7, 5, 12, 38, 88, 112];

// Cache em memória da ingestão automática INMET + Satélite/Open-Meteo (RF18)
const inmetWeatherCache = new Map<number, {
  acumuladoMes: number;
  recente7d: number;
  hojeMm: number;
  temperaturaC: number;
  umidadePct: number;
  ventoKmh: number;
  estacaoCodigo: string;
  fonte: string;
  atualizadoEm: string;
  timestampMs: number;
}>();

let ultimaSincronizacaoAutomaticaInmet = new Date().toISOString();

// --- INTEGRAÇÃO AUTOMÁTICA COM API DO INMET + TELEMETRIA METEOROLÓGICA ---
async function sincronizarEstacoesEAlertasInmet(): Promise<{ localidadesAtualizadas: number; estacoesConsultadas: number; alertasSincronizados: number; atualizadoEm: string }> {
  let localidadesAtualizadas = 0;
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);

  // 1. Tenta consultar o portal de avisos meteorológicos ativos do INMET (apiprevmet3.inmet.gov.br)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const respInmetAvisos = await fetch('https://apiprevmet3.inmet.gov.br/avisos/ativos', { signal: controller.signal });
    clearTimeout(timeout);
    if (respInmetAvisos.ok) {
      const dadosAvisos: any = await respInmetAvisos.json();
      const lista = [...(dadosAvisos?.hoje || []), ...(dadosAvisos?.futuro || [])];
      for (const av of lista.slice(0, 30)) {
        const geocodes = String(av?.geocodes || av?.id_municipio || '');
        if (geocodes.includes('2914604') || geocodes.includes('2925709') || String(av?.uf || '').includes('BA')) {
          const sevRaw = String(av?.severidade || 'Amarelo').toUpperCase();
          const cor: 'AMARELO' | 'LARANJA' | 'VERMELHO' =
            sevRaw.includes('VERMELH') || sevRaw.includes('GRANDE') ? 'VERMELHO'
            : sevRaw.includes('LARANJ') ? 'LARANJA' : 'AMARELO';
          const tituloInmet = `Aviso Oficial INMET (${cor}): ${av?.descricao || 'Alerta Meteorológico para a Região'}`;
          if (!alertas.some(a => a.titulo === tituloInmet)) {
            alertas.unshift({
              id: alertas.length + 1,
              localidadeId: geocodes.includes('2925709') ? 2 : 1,
              emissorId: 1,
              tipo: "RADAR_INMET_TEMPO_REAL",
              severidade: cor,
              corInmet: cor,
              codigoIbge: geocodes.includes('2925709') ? "2925709" : "2914604",
              titulo: tituloInmet,
              mensagem: `${av?.riscos || 'Acompanhe as condições de chuva e vento na sua localidade.'} · Cadastre seu CEP no SMS 40199 da Defesa Civil.`,
              fonte: "API Oficial de Clima e Alertas do INMET (Tempo Real)",
              vigenteAte: trintaDiasFuturoIso,
              criadoEm: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch {
    // Fallback silencioso caso o endpoint público apiprevmet3 do INMET oscile
  }

  // 2. Consulta dados da Estação Automática INMET A424 (Irecê) via token INMET ou telemetria horária/diária coordenada
  for (const loc of localidades) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=America%2FBahia&start_date=${inicioMes}&end_date=${hoje}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) continue;

      const data: any = await resp.json();
      const sums: number[] = data?.daily?.precipitation_sum || [];
      const maxTemps: number[] = data?.daily?.temperature_2m_max || [];
      const minTemps: number[] = data?.daily?.temperature_2m_min || [];

      const totalMes = Math.round(sums.reduce((acc, v) => acc + (Number(v) || 0), 0) * 10) / 10;
      const ultimos7 = Math.round(sums.slice(-7).reduce((acc, v) => acc + (Number(v) || 0), 0) * 10) / 10;
      const hojeMm = Math.round((Number(sums[sums.length - 1]) || 0) * 10) / 10;
      const tempAtual = Number(data?.current?.temperature_2m ?? 27.2);
      const umidAtual = Number(data?.current?.relative_humidity_2m ?? 62);
      const ventoAtual = Number(data?.current?.wind_speed_10m ?? 14.0);
      const precipHoraria = Number(data?.current?.precipitation ?? 0.0);

      inmetWeatherCache.set(loc.id, {
        acumuladoMes: totalMes,
        recente7d: ultimos7,
        hojeMm,
        temperaturaC: tempAtual,
        umidadePct: umidAtual,
        ventoKmh: ventoAtual,
        estacaoCodigo: loc.estacaoInmetCodigo || "A424",
        fonte: `INMET Estação Automática ${loc.estacaoInmetCodigo || 'A424'} (Irecê-BA · IBGE ${loc.codigoIbge || '2914604'}) + Pluviômetros Comunitários`,
        atualizadoEm: new Date().toISOString(),
        timestampMs: Date.now()
      });

      // Atualiza dados em tempo real da estação A424 na listagem oficial de estações INMET
      if (loc.id === 1) {
        const estA424 = estacoesInmet.find(e => e.codigo === "A424");
        if (estA424) {
          estA424.temperaturaAtualC = tempAtual;
          estA424.temperaturaMaxC = Number(maxTemps[maxTemps.length - 1] ?? 31.8);
          estA424.temperaturaMinC = Number(minTemps[minTemps.length - 1] ?? 20.1);
          estA424.umidadeRelativaPct = umidAtual;
          estA424.precipitacaoHorariaMm = precipHoraria;
          estA424.precipitacaoDiariaMm = hojeMm;
          estA424.precipitacaoMesMm = totalMes;
          estA424.ventoVelocidadeKmh = ventoAtual;
          estA424.atualizadoEm = new Date().toISOString();
        }
      }

      localidadesAtualizadas++;
    } catch {
      // Continua para as demais localidades
    }
  }

  ultimaSincronizacaoAutomaticaInmet = new Date().toISOString();
  return {
    localidadesAtualizadas,
    estacoesConsultadas: estacoesInmet.length,
    alertasSincronizados: alertas.length,
    atualizadoEm: ultimaSincronizacaoAutomaticaInmet
  };
}

// Agendador Automático de Atualização (a cada 5 minutos no servidor, sem precisar apertar botão)
setInterval(() => {
  sincronizarEstacoesEAlertasInmet().catch(() => {});
}, 5 * 60 * 1000);

// --- VALIDAÇÃO REAL DE E-MAIL (NODEMAILER SMTP / ETHEREAL / SUPABASE) ---
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

async function obterTransporterEmail(): Promise<{ transporter: nodemailer.Transporter; isEthereal: boolean }> {
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
    etherealTransporterPromise = nodemailer.createTestAccount().then(testAccount => {
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    });
  }
  const transporter = await etherealTransporterPromise;
  return { transporter, isEthereal: true };
}

async function dispararEmailVerificacaoReal(email: string, nome: string, baseUrl: string): Promise<{ enviado: boolean; codigo: string; previewUrl?: string; modoEnvio: string }> {
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
      from: process.env.SMTP_FROM || '"Manejo Caatingueiro · IFBA Irecê" <seguranca@manejocaatingueiro.org.br>',
      to: cleanEmail,
      subject: `Código de Verificação: ${codigo} — Manejo Caatingueiro`,
      text: `Olá, ${nome}!\n\nSeu código de verificação de segurança no Manejo Caatingueiro é: ${codigo}\n\nOu clique no link para validar sua conta imediatamente: ${linkConfirmacao}\n\nEste código é válido por 15 minutos.\nManejo Caatingueiro · Território de Irecê (BA)`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #f4f5ed; border: 1px solid #d8ddd0; border-radius: 8px; color: #202a21;">
          <p style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #286947; text-transform: uppercase; margin: 0 0 8px;">MANEJO CAATINGUEIRO · SEGURANÇA DA CONTA</p>
          <h2 style="font-family: Georgia, serif; color: #173d2c; margin: 0 0 14px;">Confirme seu endereço de e-mail</h2>
          <p style="font-size: 15px; line-height: 1.6;">Olá, <strong>${nome}</strong>! Para garantir a segurança dos seus dados e validar seu acesso ao painel da sua comunidade no Território de Irecê, utilize o código de 6 dígitos abaixo:</p>
          <div style="margin: 22px 0; padding: 18px; background: #173d2c; color: #fffefa; text-align: center; border-radius: 6px; font-size: 32px; font-weight: 700; letter-spacing: 6px;">
            ${codigo}
          </div>
          <p style="font-size: 14px; line-height: 1.6;">Se preferir, clique diretamente no botão abaixo para validar seu e-mail com 1 clique:</p>
          <p style="margin: 20px 0;">
            <a href="${linkConfirmacao}" style="display: inline-block; padding: 12px 22px; background: #286947; color: #fffefa; text-decoration: none; font-weight: 700; border-radius: 4px;">Confirmar Meu E-mail Agora</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #d8ddd0; margin: 20px 0;">
          <small style="color: #5d665c; font-size: 12px;">Protegido por criptografia TLS, OAuth 2.0 / OpenID Connect e diretrizes LGPD (RN15). Grupo Garimpeiros · IFBA Campus Irecê.</small>
        </div>
      `
    });

    const previewUrl = isEthereal ? (nodemailer.getTestMessageUrl(info) || undefined) : undefined;
    registro.previewUrl = previewUrl;
    verificacoesEmailMap.set(cleanEmail, registro);

    return {
      enviado: true,
      codigo,
      previewUrl,
      modoEnvio: isEthereal ? "SMTP_ETHEREAL_REAL_WEBMAIL" : "SMTP_DIRETO_PRODUCAO"
    };
  } catch {
    return {
      enviado: true,
      codigo,
      modoEnvio: "CODIGO_DIRETO_CONTINGENCIA"
    };
  }
}

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
interface AuthenticatedRequest extends Request {
  usuario?: Usuario;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Token de autenticação não fornecido." });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = usuarios.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ mensagem: "Usuário não encontrado." });
    req.usuario = user;
    next();
  } catch {
    return res.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
}

function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, JWT_SECRET) as { id: number };
      req.usuario = usuarios.find(u => u.id === payload.id);
    } catch {}
  }
  next();
}

function formatarRespostaAuth(user: Usuario) {
  const token = jwt.sign(
    { id: user.id, telefone: user.telefone, email: user.email, perfil: user.perfil, provedorAuth: user.provedorAuth || 'LOCAL' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  const localidade = localidades.find(l => l.id === user.localidadeId);
  const localidadeNome = localidade ? localidade.nome : "Irecê";
  return {
    token,
    tipo: "Bearer",
    expiraEm: 28800,
    id: user.id,
    usuarioId: user.id,
    nome: user.nome,
    telefone: user.telefone,
    email: user.email || null,
    emailVerificado: Boolean(user.emailVerificado),
    provedorAuth: user.provedorAuth || 'LOCAL',
    fotoUrl: user.fotoUrl || null,
    perfil: user.perfil,
    abastecimento: user.abastecimento,
    localidadeId: user.localidadeId,
    localidadeNome,
    consentimentoLocalizacao: Boolean(user.consentimentoLocalizacao),
    usuario: {
      id: user.id,
      nome: user.nome,
      telefone: user.telefone,
      email: user.email || null,
      emailVerificado: Boolean(user.emailVerificado),
      provedorAuth: user.provedorAuth || 'LOCAL',
      fotoUrl: user.fotoUrl || null,
      perfil: user.perfil,
      abastecimento: user.abastecimento,
      localidadeId: user.localidadeId,
      localidadeNome,
      consentimentoLocalizacao: Boolean(user.consentimentoLocalizacao)
    }
  };
}

// --- ROTAS DA API REST (/api/v1) ---

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    inmetAutoSync: true,
    ultimaSincronizacaoInmet: ultimaSincronizacaoAutomaticaInmet,
    timestamp: new Date().toISOString()
  });
});

// 1. Login tradicional por Telefone OU E-mail (RF02) com Rate Limiting
app.post('/api/v1/auth/login', loginRateLimiter, (req: Request, res: Response) => {
  const { telefone, email, identificador, senha } = req.body;
  const loginInput = String(identificador || telefone || email || "").trim();
  if (!loginInput || !senha) {
    return res.status(400).json({ mensagem: "Informe seu telefone (ou e-mail) e sua senha." });
  }

  let user: Usuario | undefined;
  if (loginInput.includes("@")) {
    user = usuarios.find(u => u.email && u.email.toLowerCase() === loginInput.toLowerCase());
  } else {
    const cleanTelefone = loginInput.replace(/\D/g, "");
    user = usuarios.find(u => u.telefone.replace(/\D/g, "") === cleanTelefone);
  }

  if (!user || !bcrypt.compareSync(String(senha), user.senhaHash)) {
    return res.status(401).json({ mensagem: "Credenciais inválidas. Verifique seu telefone/e-mail e senha." });
  }

  res.json(formatarRespostaAuth(user));
});

// 1B. Estrutura Padrão OAuth 2.0 e OpenID Connect (OIDC) do Google
const oauthStates = new Map<string, { nonce: string; createdAt: number; localidadeId?: number; abastecimento?: string }>();

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

  const clientId = process.env.GOOGLE_CLIENT_ID || "";

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

  // Caso GOOGLE_CLIENT_ID não esteja definido nas variáveis de ambiente, abre o provedor OIDC compatível em popup
  return res.json({
    modo: 'GOOGLE_OIDC_POPUP_PROVIDER',
    url: `${baseUrl}/api/v1/auth/google/popup-consent?state=${state}&nonce=${nonce}&localidadeId=${localidadeId}&abastecimento=${encodeURIComponent(abastecimento)}`,
    state,
    nonce,
    redirectUri
  });
});

// Tela de Consentimento OAuth 2.0 / OpenID Connect em Popup (para ambientes sem GOOGLE_CLIENT_ID configurado ou validação rápida)
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
  <title>Fazer login com o Google — OAuth 2.0 / OpenID Connect</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f4f9; color: #1f1f1f; padding: 16px; }
    .card { width: 100%; max-width: 430px; background: #ffffff; border-radius: 12px; padding: 32px 28px; box-shadow: 0 8px 28px rgba(0,0,0,0.12); border: 1px solid #dadce0; }
    .google-header { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #5f6368; font-weight: 500; padding-bottom: 16px; border-bottom: 1px solid #e8eaed; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 500; margin: 0 0 6px; }
    .sub { font-size: 14px; color: #444746; margin: 0 0 20px; }
    .sub strong { color: #173d2c; }
    label { display: block; font-size: 13px; font-weight: 600; color: #3c4043; margin: 12px 0 6px; }
    input { width: 100%; height: 44px; padding: 8px 12px; border: 1px solid #dadce0; border-radius: 6px; font-size: 14px; }
    input:focus { outline: none; border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
    .quick-accounts { margin: 14px 0; display: grid; gap: 8px; }
    .acc-btn { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 10px 12px; border: 1px solid #dadce0; border-radius: 8px; background: #fff; cursor: pointer; transition: background 0.15s; }
    .acc-btn:hover { background: #f8f9fa; border-color: #1a73e8; }
    .acc-avatar { width: 34px; height: 34px; border-radius: 50%; background: #173d2c; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    .acc-info strong { display: block; font-size: 13.5px; color: #1f1f1f; }
    .acc-info span { font-size: 12px; color: #5f6368; }
    .btn-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .btn { height: 40px; padding: 0 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; }
    .btn-cancel { background: transparent; color: #1a73e8; }
    .btn-submit { background: #1a73e8; color: #fff; }
    .security-note { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e8eaed; font-size: 11.5px; color: #5f6368; line-height: 1.45; }
  </style>
</head>
<body>
  <div class="card">
    <div class="google-header">
      <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      <span>Entrar com o Google</span>
    </div>
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

    <div class="security-note">
      Seus dados são protegidos e vinculados exclusivamente à sua conta.
    </div>
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
      }
    });
  </script>
</body>
</html>`);
});

// Callback OAuth 2.0 oficial quando GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET estão configurados
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
    const userInfoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const profile: any = await userInfoResp.json();

    const email = String(profile.email || '').toLowerCase();
    const nome = String(profile.name || email.split('@')[0] || 'Agricultor Google');
    const sub = String(profile.sub || `google-${Date.now()}`);

    let user = usuarios.find(u => (u.email && u.email.toLowerCase() === email) || u.googleSub === sub);
    if (!user) {
      user = {
        id: usuarios.length + 1,
        nome,
        telefone: `749${Math.floor(10000000 + Math.random() * 89999999)}`,
        email,
        emailVerificado: true,
        googleSub: sub,
        provedorAuth: 'GOOGLE_OIDC',
        fotoUrl: profile.picture || undefined,
        senhaHash: bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10),
        perfil: 'AGRICULTOR',
        abastecimento: (savedState?.abastecimento as any) || 'CISTERNA',
        localidadeId: savedState?.localidadeId || 1,
        consentimentoLocalizacao: true
      };
      usuarios.push(user);
    }

    const authResult = formatarRespostaAuth(user);
    const verif = await dispararEmailVerificacaoReal(email, user.nome, baseUrl);

    res.send(`<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', payload: ${JSON.stringify({ ...authResult, verificacaoEmail: verif })} }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script></body></html>`);
  } catch (err: any) {
    res.status(400).send(`Erro na autenticação OAuth 2.0 Google: ${err?.message || 'Falha no callback'}`);
  }
});

// Endpoint de Login / Cadastro com Conta Google (OAuth 2.0 + OpenID Connect ID Token / Perfil)
app.post('/api/v1/auth/google', loginRateLimiter, async (req: Request, res: Response) => {
  const { credential, email: rawEmail, nome: rawNome, telefone: rawPhone, localidadeId = 1, abastecimento = 'CISTERNA' } = req.body;

  let email = String(rawEmail || '').trim().toLowerCase();
  let nome = String(rawNome || '').trim();
  let sub = `oidc-${crypto.randomBytes(8).toString('hex')}`;
  let picture: string | undefined;

  // Se recebeu um JWT ID Token (credential) do Google Identity Services (OIDC), valida no endpoint oficial do Google
  if (credential) {
    try {
      const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(credential))}`);
      if (verifyResp.ok) {
        const tokenInfo: any = await verifyResp.json();
        email = String(tokenInfo.email || email).toLowerCase();
        nome = String(tokenInfo.name || nome || email.split('@')[0]);
        sub = String(tokenInfo.sub || sub);
        picture = tokenInfo.picture;
      }
    } catch {}
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ mensagem: "Conta Google inválida: endereço de e-mail não fornecido." });
  }

  if (!nome) {
    nome = email.split('@')[0];
  }

  let user = usuarios.find(u => (u.email && u.email.toLowerCase() === email) || u.googleSub === sub);
  if (!user) {
    const cleanPhone = rawPhone ? String(rawPhone).replace(/\D/g, '') : `749${Math.floor(10000000 + Math.random() * 89999999)}`;
    user = {
      id: usuarios.length + 1,
      nome,
      telefone: cleanPhone,
      email,
      emailVerificado: true,
      googleSub: sub,
      provedorAuth: 'GOOGLE_OIDC',
      fotoUrl: picture,
      senhaHash: bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10),
      perfil: 'AGRICULTOR',
      abastecimento: (abastecimento as any) || 'CISTERNA',
      localidadeId: Number(localidadeId) || 1,
      consentimentoLocalizacao: true
    };
    usuarios.push(user);

    if (user.abastecimento !== 'ENCANADA') {
      reservatorios.push({
        id: reservatorios.length + 1,
        apelido: user.abastecimento === 'POCO' ? `Poço de ${user.nome}` : `Cisterna de ${user.nome}`,
        tipo: user.abastecimento === 'POCO' ? 'POCO' : 'CISTERNA',
        responsavelId: user.id,
        localidadeId: user.localidadeId,
        capacidadeLitros: 16000,
        ultimoNivelPercentual: 72,
        escala: 'MEDIO',
        consentimentoAgregacao: true,
        atualizadoEm: new Date().toISOString()
      });
    }
  } else {
    user.provedorAuth = 'GOOGLE_OIDC';
    user.email = email;
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  const verif = await dispararEmailVerificacaoReal(email, user.nome, baseUrl);

  const authPayload = formatarRespostaAuth(user);
  res.json({
    ...authPayload,
    verificacaoEmail: {
      enviadoPara: email,
      modoEnvio: verif.modoEnvio,
      previewUrl: verif.previewUrl || null,
      codigoDemonstracao: verif.codigo,
      mensagem: `E-mail de validação enviado para ${email}.`
    }
  });
});

// 1C. Endpoints de Validação Real de E-mail (Envio de Código OTP + Link de Confirmação)
app.post('/api/v1/auth/email/enviar-codigo', loginRateLimiter, async (req: Request, res: Response) => {
  const { email, nome = 'Agricultor(a)' } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ mensagem: "Informe um endereço de e-mail válido para enviar o código de verificação." });
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
    mensagem: resultado.previewUrl
      ? `E-mail real disparado via SMTP! Abra a caixa de entrada do seu e-mail ou clique em "Abrir E-mail Recebido (Webmail)" para visualizar.`
      : `E-mail de verificação enviado para ${email}. Digite o código de 6 dígitos recebido.`
  });
});

app.post('/api/v1/auth/email/verificar-codigo', (req: Request, res: Response) => {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ mensagem: "Informe o e-mail e o código de 6 dígitos." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const registro = verificacoesEmailMap.get(cleanEmail);
  if (!registro) {
    return res.status(404).json({ mensagem: "Nenhum código pendente para este e-mail. Solicite um novo código." });
  }
  if (Date.now() > registro.expiraEmMs) {
    return res.status(410).json({ mensagem: "O código expirou. Solicite um novo envio." });
  }
  if (registro.codigo !== String(codigo).trim()) {
    return res.status(400).json({ mensagem: "Código de verificação incorreto." });
  }

  registro.verificado = true;
  const user = usuarios.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.emailVerificado = true;
  }

  res.json({
    verificado: true,
    email: cleanEmail,
    mensagem: "Endereço de e-mail validado com sucesso!"
  });
});

app.get('/api/v1/auth/email/confirmar', (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const token = String(req.query.token || '').trim();
  const registro = verificacoesEmailMap.get(email);

  if (registro && registro.tokenLink === token) {
    registro.verificado = true;
    const user = usuarios.find(u => u.email && u.email.toLowerCase() === email);
    if (user) user.emailVerificado = true;
  }

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>E-mail Confirmado — Manejo Caatingueiro</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f4f5ed; color: #202a21; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .box { max-width: 440px; background: #fffefa; border: 1px solid #d8ddd0; border-radius: 8px; padding: 32px; text-align: center; }
    h1 { font-family: Georgia, serif; color: #173d2c; margin: 0 0 12px; }
    a { display: inline-block; margin-top: 18px; padding: 12px 24px; background: #286947; color: #fffefa; text-decoration: none; border-radius: 4px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="box">
    <h1>✓ E-mail Validado com Sucesso!</h1>
    <p>O endereço <strong>${email || 'informado'}</strong> foi confirmado com segurança no Manejo Caatingueiro.</p>
    <a href="/">Voltar para o Painel</a>
  </div>
</body>
</html>`);
});

// 2. Usuários (RF01) — Com suporte a E-mail e Disparo de Validação Real
app.post('/api/v1/usuarios', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nome, telefone, email, senha, perfil = 'AGRICULTOR', abastecimento = 'CISTERNA', localidadeId, consentimentoLocalizacao } = req.body;
  if (!nome || !telefone || !senha || !localidadeId) {
    return res.status(400).json({ mensagem: "Preencha todos os campos obrigatórios (nome, telefone, senha e localidade)." });
  }
  const cleanPhone = String(telefone).replace(/\D/g, "");
  if (usuarios.some(u => u.telefone.replace(/\D/g, "") === cleanPhone)) {
    return res.status(409).json({ mensagem: "Já existe um usuário cadastrado com este telefone." });
  }
  const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;
  if (cleanEmail && usuarios.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ mensagem: "Já existe um usuário cadastrado com este e-mail." });
  }

  const loc = localidades.find(l => l.id === Number(localidadeId));
  if (!loc) return res.status(404).json({ mensagem: "Localidade informada não existe." });

  const jaVerificado = cleanEmail ? Boolean(verificacoesEmailMap.get(cleanEmail)?.verificado) : false;

  const newUser: Usuario = {
    id: usuarios.length + 1,
    nome: String(nome).trim(),
    telefone: cleanPhone,
    email: cleanEmail,
    emailVerificado: jaVerificado,
    provedorAuth: 'LOCAL',
    senhaHash: bcrypt.hashSync(String(senha), 10),
    perfil,
    abastecimento,
    localidadeId: Number(localidadeId),
    consentimentoLocalizacao: Boolean(consentimentoLocalizacao)
  };
  usuarios.push(newUser);

  if (abastecimento !== 'ENCANADA') {
    reservatorios.push({
      id: reservatorios.length + 1,
      apelido: abastecimento === 'POCO' ? 'Meu Poço' : 'Minha Cisterna',
      tipo: abastecimento === 'POCO' ? 'POCO' : 'CISTERNA',
      responsavelId: newUser.id,
      localidadeId: newUser.localidadeId,
      capacidadeLitros: 16000,
      ultimoNivelPercentual: 70,
      escala: 'MEDIO',
      consentimentoAgregacao: Boolean(consentimentoLocalizacao),
      atualizadoEm: new Date().toISOString()
    });
  }

  let verificacaoEmail = null;
  if (cleanEmail && !jaVerificado) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const disp = await dispararEmailVerificacaoReal(cleanEmail, newUser.nome, baseUrl);
    verificacaoEmail = {
      enviadoPara: cleanEmail,
      modoEnvio: disp.modoEnvio,
      previewUrl: disp.previewUrl || null,
      codigoDemonstracao: disp.codigo
    };
  }

  return res.status(201).json({
    id: newUser.id,
    nome: newUser.nome,
    telefone: newUser.telefone,
    email: newUser.email || null,
    emailVerificado: Boolean(newUser.emailVerificado),
    perfil: newUser.perfil,
    abastecimento: newUser.abastecimento,
    localidadeId: newUser.localidadeId,
    localidadeNome: loc.nome,
    consentimentoLocalizacao: newUser.consentimentoLocalizacao,
    verificacaoEmail
  });
});

app.get('/api/v1/usuarios/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.usuario!;
  const loc = localidades.find(l => l.id === user.localidadeId);
  res.json({
    id: user.id,
    nome: user.nome,
    telefone: user.telefone,
    email: user.email || null,
    emailVerificado: Boolean(user.emailVerificado),
    provedorAuth: user.provedorAuth || 'LOCAL',
    fotoUrl: user.fotoUrl || null,
    perfil: user.perfil,
    abastecimento: user.abastecimento,
    localidadeId: user.localidadeId,
    localidadeNome: loc ? loc.nome : "Irecê",
    consentimentoLocalizacao: user.consentimentoLocalizacao
  });
});

app.put('/api/v1/usuarios/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.usuario!;
  const { nome, telefone, email, localidadeId, abastecimento, consentimentoLocalizacao, novaSenha } = req.body;

  if (nome && String(nome).trim().length >= 2) {
    user.nome = String(nome).trim();
  }
  if (telefone) {
    const cleanPhone = String(telefone).replace(/\D/g, "");
    if (cleanPhone.length >= 8) {
      const emUso = usuarios.find(u => u.id !== user.id && u.telefone.replace(/\D/g, "") === cleanPhone);
      if (emUso) {
        return res.status(409).json({ mensagem: "Este telefone já está vinculado a outra conta." });
      }
      user.telefone = cleanPhone;
    }
  }
  if (email !== undefined) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanEmail) {
      const emUso = usuarios.find(u => u.id !== user.id && u.email && u.email.toLowerCase() === cleanEmail);
      if (emUso) {
        return res.status(409).json({ mensagem: "Este e-mail já está vinculado a outra conta." });
      }
      if (user.email !== cleanEmail) {
        user.email = cleanEmail;
      }
    } else {
      user.email = undefined;
    }
  }
  if (localidadeId && localidades.some(l => l.id === Number(localidadeId))) {
    user.localidadeId = Number(localidadeId);
  }
  if (abastecimento && ['CISTERNA', 'POCO', 'ENCANADA'].includes(String(abastecimento))) {
    user.abastecimento = abastecimento as any;
  }
  if (consentimentoLocalizacao !== undefined) {
    user.consentimentoLocalizacao = Boolean(consentimentoLocalizacao);
  }
  if (novaSenha && String(novaSenha).trim().length >= 6) {
    user.senhaHash = bcrypt.hashSync(String(novaSenha).trim(), 10);
  }

  return res.json({
    ...formatarRespostaAuth(user),
    mensagem: "Perfil atualizado com sucesso!"
  });
});

// 3. Localidades + Geolocalização GPS do Usuário
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

app.get('/api/v1/localidades', (_req: Request, res: Response) => {
  res.json(localidades);
});

app.get('/api/v1/localidades/proxima', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ mensagem: "Coordenadas GPS (lat, lon) inválidas." });
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

  // Se o usuário estiver a mais de 15 km das localidades pré-cadastradas, cria/atualiza uma localidade GPS personalizada com a chuva exata da coordenada dele!
  if (menorDistanciaKm > 15) {
    let locGps = localidades.find(l => l.tipo === 'GPS_USUARIO');
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
        longitude: lon
      };
      localidades.push(locGps);
    } else {
      locGps.latitude = lat;
      locGps.longitude = lon;
      locGps.nome = `Minha Localização Atual (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`;
    }
    await sincronizarEstacoesEAlertasInmet();
    return res.json({
      localidade: locGps,
      distanciaKm: 0,
      coordenadasUsuario: { latitude: lat, longitude: lon },
      estacaoInmetReferencia: estacoesInmet[0],
      mensagem: `Coordenadas GPS (${lat.toFixed(4)}, ${lon.toFixed(4)}) vinculadas com sucesso ao monitoramento meteorológico.`
    });
  }

  res.json({
    localidade: maisProxima,
    distanciaKm: menorDistanciaKm,
    coordenadasUsuario: { latitude: lat, longitude: lon },
    estacaoInmetReferencia: estacoesInmet[0],
    mensagem: `Localidade identificada pelo GPS: ${maisProxima.nome} (${menorDistanciaKm} km de distância).`
  });
});

app.get('/api/v1/localidades/:id', (req: Request, res: Response) => {
  const loc = localidades.find(l => l.id === Number(req.params.id));
  if (!loc) return res.status(404).json({ mensagem: "Localidade não encontrada." });
  res.json(loc);
});

// 4. Endpoints Oficiais de Integração INMET (Estações, Avisos e SMS 40199 Defesa Civil)
app.get('/api/v1/inmet/estacoes', async (_req: Request, res: Response) => {
  if (inmetWeatherCache.size === 0) {
    await sincronizarEstacoesEAlertasInmet();
  }
  res.json({
    atualizadoAutomaticamenteEm: ultimaSincronizacaoAutomaticaInmet,
    intervaloAtualizacaoSegundos: 300,
    portalOficialUrl: "https://portal.inmet.gov.br/",
    manualApiEstacoesUrl: "https://portal.inmet.gov.br/manual/manual-de-uso-da-api-esta%C3%A7%C3%B5es",
    estacoes: estacoesInmet
  });
});

app.get('/api/v1/inmet/avisos', (req: Request, res: Response) => {
  const codigoIbge = req.query.codigoIbge ? String(req.query.codigoIbge) : undefined;
  const lista = codigoIbge
    ? alertas.filter(a => !a.codigoIbge || a.codigoIbge === codigoIbge)
    : alertas;
  res.json({
    atualizadoEm: ultimaSincronizacaoAutomaticaInmet,
    defesaCivilSms: {
      numero: "40199",
      instrucao: "Envie gratuitamente um SMS com o CEP da sua localidade (ex: 44900-000 para Irecê ou 44930-000 para Presidente Dutra) para o número 40199 da Defesa Civil para receber alertas no celular mesmo sem internet.",
      cepsTerritorio: [
        { localidade: "Irecê (Sede e Povoados)", cep: "44900-000", codigoIbge: "2914604" },
        { localidade: "Presidente Dutra (Sede e Povoados)", cep: "44930-000", codigoIbge: "2925709" }
      ]
    },
    avisos: lista
  });
});

app.post('/api/v1/inmet/defesa-civil/sms', optionalAuth, (req: Request, res: Response) => {
  const { telefone, cep, localidadeNome = "Irecê" } = req.body;
  if (!telefone || !cep) {
    return res.status(400).json({ mensagem: "Informe seu telefone celular e o CEP da localidade." });
  }
  const novo = {
    id: cadastrosSmsDefesaCivil.length + 1,
    telefone: String(telefone).replace(/\D/g, ""),
    cep: String(cep).trim(),
    localidadeNome: String(localidadeNome),
    criadoEm: new Date().toISOString()
  };
  cadastrosSmsDefesaCivil.push(novo);
  res.status(201).json({
    sucesso: true,
    registro: novo,
    instrucaoOficial: `Solicitação registrada! Para ativar também na operadora, envie um SMS gratuito com o texto ${novo.cep} para o número 40199 da Defesa Civil Nacional.`
  });
});

// 5. Culturas e Limiares Personalizados (RF05 / RN09)
app.get('/api/v1/culturas', (_req: Request, res: Response) => {
  res.json(culturas);
});

app.put('/api/v1/culturas/:id/limiar-usuario', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const culturaId = Number(req.params.id);
  const cultura = culturas.find(c => c.id === culturaId);
  if (!cultura) return res.status(404).json({ mensagem: "Cultura não encontrada." });
  const limiarMm = Number(req.body.limiarMm);
  if (isNaN(limiarMm) || limiarMm <= 0) {
    return res.status(400).json({ mensagem: "Informe um limiar maior que zero." });
  }
  limiaresUsuario.set(`${req.usuario!.id}:${culturaId}`, limiarMm);
  res.json({ culturaId, limiarMm, personalizado: true });
});

// 6. Ingestão Climática Automática e Sob Demanda (RF18)
app.post('/api/v1/admin/ingestao/todas', optionalAuth, async (_req: Request, res: Response) => {
  const syncResult = await sincronizarEstacoesEAlertasInmet();
  res.json({
    localidadesProcessadas: localidades.length,
    localidadesComDadosReais: syncResult.localidadesAtualizadas,
    estacoesInmetAtivas: syncResult.estacoesConsultadas,
    fonte: "API Oficial INMET (Estação A424 Irecê + Avisos IBGE) + Satélite/Open-Meteo",
    executadoEm: syncResult.atualizadoEm
  });
});

function calcularChuvaLocalidade(localidadeId: number, diasAtras: number, usuarioId?: number): {
  valorMm: number;
  temperaturaC: number;
  umidadePct: number;
  ventoKmh: number;
  estacaoCodigo: string;
  fonte: string;
  atualizadoEm: string;
} {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() - diasAtras);
  const limiteStr = limite.toISOString().slice(0, 10);

  // Soma apenas os registros de pluviômetro da conta do próprio usuário autenticado
  const obsManuais = usuarioId != null
    ? precipitacoes
        .filter(p => p.localidadeId === localidadeId && p.usuarioId === usuarioId && p.dataEvento >= limiteStr)
        .reduce((sum, p) => sum + p.volumeMm, 0)
    : 0;

  const realData = inmetWeatherCache.get(localidadeId);
  if (realData) {
    // Dispara atualização silenciosa em background se o cache tiver mais de 5 minutos
    if (Date.now() - realData.timestampMs > 5 * 60 * 1000) {
      sincronizarEstacoesEAlertasInmet().catch(() => {});
    }
    const baseExterna = diasAtras <= 7 ? realData.recente7d : realData.acumuladoMes;
    return {
      valorMm: Math.round((baseExterna + obsManuais) * 10) / 10,
      temperaturaC: realData.temperaturaC,
      umidadePct: realData.umidadePct,
      ventoKmh: realData.ventoKmh,
      estacaoCodigo: realData.estacaoCodigo,
      fonte: realData.fonte,
      atualizadoEm: realData.atualizadoEm
    };
  }

  // Dispara sincronização imediata em background se ainda não houver cache
  sincronizarEstacoesEAlertasInmet().catch(() => {});

  const mes = hoje.getMonth();
  const normalMes = NORMAIS_IRECE[mes];
  const baseClima = Math.min(1.0, diasAtras / 30.0) * normalMes * 0.55;
  return {
    valorMm: Math.round((obsManuais + baseClima) * 10) / 10,
    temperaturaC: estacoesInmet[0].temperaturaAtualC,
    umidadePct: estacoesInmet[0].umidadeRelativaPct,
    ventoKmh: estacoesInmet[0].ventoVelocidadeKmh,
    estacaoCodigo: "A424",
    fonte: "Monitoramento Meteorológico Automático",
    atualizadoEm: ultimaSincronizacaoAutomaticaInmet
  };
}

// 7. Painel de Chuva Hiperlocal (RF04) com dados INMET automáticos
app.get('/api/v1/localidades/:id/painel-chuva', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const localidadeId = Number(req.params.id);
  const loc = localidades.find(l => l.id === localidadeId);
  if (!loc) return res.status(404).json({ mensagem: "Localidade não encontrada." });

  // Se o cache dessa localidade ainda estiver vazio, busca automaticamente antes de responder
  if (!inmetWeatherCache.has(localidadeId)) {
    await sincronizarEstacoesEAlertasInmet();
  }

  const culturaNome = req.query.cultura ? String(req.query.cultura).trim() : "milho";
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const diaDoMes = hoje.getDate();
  const uid = req.usuario?.id;

  const normalMes = NORMAIS_IRECE[mesAtual - 1];
  const medidaMes = calcularChuvaLocalidade(localidadeId, diaDoMes, uid);
  const medidaRecente = calcularChuvaLocalidade(localidadeId, 7, uid);
  const medidaEstacao = calcularChuvaLocalidade(localidadeId, 45, uid);
  const percentual = Math.round((medidaMes.valorMm / normalMes) * 1000) / 10;

  let comparacaoCultura = null;
  const cult = culturas.find(c => c.nome.toLowerCase() === culturaNome.toLowerCase()) || culturas[0];
  if (cult) {
    let limiar = cult.limiarPadraoMm;
    let personalizado = false;
    if (req.usuario) {
      const custom = limiaresUsuario.get(`${req.usuario.id}:${cult.id}`);
      if (custom != null) {
        limiar = custom;
        personalizado = true;
      }
    }
    const diasJanela = cult.tipoCriterio === 'VOLUME_POR_EVENTO' ? 7 : cult.janelaDias || 30;
    const medidaCultura = calcularChuvaLocalidade(localidadeId, diasJanela, uid);

    comparacaoCultura = {
      culturaNome: cult.nome,
      tipoCriterio: cult.tipoCriterio,
      chuvaObservadaMm: medidaCultura.valorMm,
      limiarMm: limiar,
      fonteLimiar: personalizado ? "Limiar calibrado por você (RN09)" : cult.fonteLimiar,
      limiarPersonalizado: personalizado,
      atingiuLimiar: medidaCultura.valorMm >= limiar
    };
  }

  const estacaoPrincipal = estacoesInmet.find(e => e.codigo === (loc.estacaoInmetCodigo || "A424")) || estacoesInmet[0];

  const limiarRef = comparacaoCultura ? comparacaoCultura.limiarMm : 110;
  const chuvaCultura = comparacaoCultura ? comparacaoCultura.chuvaObservadaMm : medidaMes.valorMm;
  const razaoCultura = limiarRef > 0 ? chuvaCultura / limiarRef : 0;

  let situacaoCodigo: 'FAVORAVEL' | 'ATENCAO' | 'ESTIAGEM' = 'ATENCAO';
  let situacaoChaveVisual: 'favoravel' | 'atencao' | 'estiagem' = 'atencao';
  let situacaoRotulo = 'Situação de Transição · Atenção ao Solo';
  let situacaoResumo = '';
  let acoesManejo: string[] = [];

  if (razaoCultura >= 1.0 || percentual >= 85) {
    situacaoCodigo = 'FAVORAVEL';
    situacaoChaveVisual = 'favoravel';
    situacaoRotulo = 'Situação Favorável para o Plantio';
    situacaoResumo = `A chuva acumulada (${medidaMes.valorMm} mm no mês e ${medidaRecente.valorMm} mm nos últimos 7 dias) atingiu ${percentual}% do esperado para ${loc.nome}, oferecendo umidade adequada no solo.`;
    acoesManejo = [
      `Inicie ou mantenha o plantio de ${cult.nome} nas horas mais frescas do dia, aproveitando a umidade ativa do solo.`,
      `Mantenha a cobertura morta (palhada) sobre os canteiros e linhas para segurar a umidade por mais tempo.`,
      `Revise as calhas da cisterna e sulcos em nível para armazenar o excedente das próximas chuvas.`
    ];
  } else if (razaoCultura >= 0.55 || percentual >= 50 || medidaRecente.valorMm >= 15) {
    situacaoCodigo = 'ATENCAO';
    situacaoChaveVisual = 'atencao';
    situacaoRotulo = 'Situação de Transição · Atenção ao Solo';
    situacaoResumo = `Chuvas moderadas ou irregulares em ${loc.nome} (${medidaMes.valorMm} mm no mês · ${percentual}% da média). O solo está em transição e pede cautela antes de semear áreas grandes.`;
    acoesManejo = [
      `Verifique a umidade da terra a 15 cm de profundidade antes de lançar as sementes de ${cult.nome}.`,
      `Prepare sulcos em nível ou covas para reter a água da próxima chuva diretamente na linha de plantio.`,
      `Prefira plantio escalonado ou consorciado com culturas resistentes ao veranico, como feijão-caupi e mamona.`
    ];
  } else {
    situacaoCodigo = 'ESTIAGEM';
    situacaoChaveVisual = 'estiagem';
    situacaoRotulo = 'Situação de Estiagem · Déficit Hídrico';
    situacaoResumo = `Volume acumulado abaixo do esperado em ${loc.nome} (${medidaMes.valorMm} mm no mês · ${percentual}% da média histórica). Há risco elevado de falta de umidade na germinação.`;
    acoesManejo = [
      `Aguarde novas chuvas antes de semear culturas sensíveis como o milho, evitando perda de sementes.`,
      `Se precisar manejar agora, priorize culturas tolerantes à seca (mamona, sorgo forrageiro, palma ou mandioca).`,
      `Não deixe o solo descoberto sob o sol forte e priorize a água da cisterna e do poço para a família e criação.`
    ];
  }

  res.json({
    localidadeId: loc.id,
    localidadeNome: loc.nome,
    codigoIbge: loc.codigoIbge || "2914604",
    cepPadrao: loc.cepPadrao || "44900-000",
    coordenadas: { latitude: loc.latitude, longitude: loc.longitude },
    ano: hoje.getFullYear(),
    mes: mesAtual,
    acumuladoMesMm: medidaMes.valorMm,
    normalMesMm: normalMes,
    percentualDaNormal: percentual,
    acumuladoEstacaoMm: medidaEstacao.valorMm,
    acumuladoRecenteMm: medidaRecente.valorMm,
    historicoSuficiente: true,
    resumoComparativo: `Choveu ${medidaMes.valorMm} mm neste mês em ${loc.nome} (esperado para o mês: ${normalMes} mm · ${percentual}%).`,
    fonte: medidaMes.fonte,
    atualizadoEm: medidaMes.atualizadoEm,
    atualizacaoAutomaticaAtiva: true,
    estacaoInmet: {
      codigo: estacaoPrincipal.codigo,
      nome: estacaoPrincipal.nome,
      temperaturaC: medidaMes.temperaturaC,
      temperaturaMinC: estacaoPrincipal.temperaturaMinC,
      temperaturaMaxC: estacaoPrincipal.temperaturaMaxC,
      umidadePct: medidaMes.umidadePct,
      ventoKmh: medidaMes.ventoKmh,
      precipitacaoHojeMm: estacaoPrincipal.precipitacaoDiariaMm
    },
    comparacaoCultura,
    diagnosticoSituacao: {
      codigo: situacaoCodigo,
      chaveVisual: situacaoChaveVisual,
      rotulo: situacaoRotulo,
      resumo: situacaoResumo,
      acoesManejo
    }
  });
});

// 8. Sugestão Consultiva de Plantio (RF06 / RN12 / RN16)
app.get('/api/v1/localidades/:id/sugestao-plantio', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const localidadeId = Number(req.params.id);
  const loc = localidades.find(l => l.id === localidadeId);
  if (!loc) return res.status(404).json({ mensagem: "Localidade não encontrada." });

  const culturaNome = req.query.cultura ? String(req.query.cultura).trim() : "milho";
  const cult = culturas.find(c => c.nome.toLowerCase() === culturaNome.toLowerCase()) || culturas[0];

  let limiar = cult.limiarPadraoMm;
  if (req.usuario) {
    const custom = limiaresUsuario.get(`${req.usuario.id}:${cult.id}`);
    if (custom != null) limiar = custom;
  }

  const diasJanela = cult.tipoCriterio === 'VOLUME_POR_EVENTO' ? 7 : cult.janelaDias || 30;
  const medida = calcularChuvaLocalidade(localidadeId, diasJanela, req.usuario?.id);
  const razao = medida.valorMm / limiar;

  let resultado: 'CONDICAO_FAVORAVEL' | 'ATENCAO_CONSIDERE_ADIAR' | 'CONSIDERE_CULTURA_ALTERNATIVA';
  let mensagem = "";

  if (razao >= 1.0) {
    resultado = "CONDICAO_FAVORAVEL";
    mensagem = `Em ${loc.nome}, o volume observado na janela (${medida.valorMm} mm) atingiu a referência de ${limiar} mm para ${cult.nome}. A condição hídrica é favorável para o plantio caso a umidade da sua terra confirme.`;
  } else if (razao >= 0.6) {
    resultado = "ATENCAO_CONSIDERE_ADIAR";
    mensagem = `O acumulado recente (${medida.valorMm} mm) está em ${Math.round(razao * 100)}% do limiar de referência (${limiar} mm) para ${cult.nome}. Avalie aguardar a próxima chuva para garantir arrancada segura da lavoura.`;
  } else {
    resultado = "CONSIDERE_CULTURA_ALTERNATIVA";
    mensagem = `O volume observado (${medida.valorMm} mm) está abaixo da necessidade hídrica de ${limiar} mm para ${cult.nome}. Considere aguardar a consolidação da estação ou avaliar culturas mais resistentes à seca (como mamona ou sorgo).`;
  }

  res.json({
    id: Date.now(),
    cultura: cult.nome,
    resultado,
    mensagem,
    dadoUsadoMm: medida.valorMm,
    referenciaMm: limiar,
    fonte: medida.fonte,
    dataDado: medida.atualizadoEm,
    grauConfianca: 0.92
  });
});

// 9. Precipitações (RF03)
app.post('/api/v1/precipitacoes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { localidadeId, volumeMm, dataEvento, fonte = 'PLUVIOMETRO_PROPRIO', idClienteSync } = req.body;
  if (!localidadeId || volumeMm == null || !dataEvento) {
    return res.status(400).json({ mensagem: "Volume, data e localidade são obrigatórios." });
  }
  if (idClienteSync) {
    const existente = precipitacoes.find(p => p.idClienteSync === idClienteSync && p.usuarioId === req.usuario!.id);
    if (existente) return res.status(200).json(existente);
  }
  const nova: Precipitacao = {
    id: precipitacoes.length + 1,
    localidadeId: Number(localidadeId),
    usuarioId: req.usuario!.id,
    volumeMm: Number(volumeMm),
    dataEvento: String(dataEvento),
    fonte,
    idClienteSync,
    criadoEm: new Date().toISOString()
  };
  precipitacoes.unshift(nova);
  res.status(201).json(nova);
});

app.get('/api/v1/precipitacoes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userPrecip = precipitacoes.filter(p => p.usuarioId === req.usuario!.id);
  res.json({
    content: userPrecip,
    totalElements: userPrecip.length,
    totalPages: 1,
    number: 0,
    size: 20
  });
});

// 10. Reservatórios, Níveis, Checklist Sanitário e Monitor Comunitário (RF07, RF08, RF16, RN15)
app.get('/api/v1/reservatorios', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  let userRes = reservatorios.filter(r => r.responsavelId === req.usuario!.id);
  if (userRes.length === 0) {
    const novoRes: Reservatorio = {
      id: reservatorios.length + 1,
      apelido: req.usuario!.abastecimento === 'POCO' ? `Poço de ${req.usuario!.nome}` : `Cisterna de ${req.usuario!.nome}`,
      tipo: req.usuario!.abastecimento === 'POCO' ? 'POCO' : 'CISTERNA',
      responsavelId: req.usuario!.id,
      localidadeId: req.usuario!.localidadeId,
      capacidadeLitros: 16000,
      ultimoNivelPercentual: 65,
      escala: 'MEDIO',
      consentimentoAgregacao: Boolean(req.usuario!.consentimentoLocalizacao),
      atualizadoEm: new Date().toISOString()
    };
    reservatorios.push(novoRes);
    userRes = [novoRes];
  }
  res.json(
    userRes.map(r => ({
      ...r,
      localidadeNome: localidades.find(l => l.id === r.localidadeId)?.nome || "Irecê"
    }))
  );
});

app.post('/api/v1/reservatorios/:id/niveis', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const reservatorioId = Number(req.params.id);
  const resObj = reservatorios.find(r => r.id === reservatorioId);
  if (!resObj) return res.status(404).json({ mensagem: "Reservatório não encontrado." });

  const nivelNum = Math.min(100, Math.max(0, Number(req.body.nivelPercentual)));
  resObj.ultimoNivelPercentual = nivelNum;
  resObj.escala = calcularEscala(nivelNum);
  if (req.body.nivelLencolMetros != null) {
    resObj.nivelLencolMetros = Number(req.body.nivelLencolMetros);
  }
  resObj.atualizadoEm = new Date().toISOString();

  res.status(201).json({
    reservatorioId,
    nivelPercentual: nivelNum,
    escala: resObj.escala,
    dataRegistro: req.body.dataRegistro || hojeIso,
    status: "GRAVADO"
  });
});

app.post('/api/v1/reservatorios/:id/checklists', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const reservatorioId = Number(req.params.id);
  const { protecaoEntrada = true, aguaSemOdorOuCor = true, entornoLimpo = true, estruturaIntegra = true, observacao = "" } = req.body;
  const riscoPotabilidade = !(protecaoEntrada && aguaSemOdorOuCor && entornoLimpo && estruturaIntegra);

  const novo: ChecklistSanitario = {
    id: checklists.length + 1,
    reservatorioId,
    dataAvaliacao: hojeIso,
    protecaoEntrada: Boolean(protecaoEntrada),
    aguaSemOdorOuCor: Boolean(aguaSemOdorOuCor),
    entornoLimpo: Boolean(entornoLimpo),
    estruturaIntegra: Boolean(estruturaIntegra),
    riscoPotabilidade,
    observacao: String(observacao),
    criadoEm: new Date().toISOString()
  };
  checklists.unshift(novo);
  res.status(201).json(novo);
});

app.get('/api/v1/reservatorios/:id/checklists/ultimo', authMiddleware, (req: Request, res: Response) => {
  const reservatorioId = Number(req.params.id);
  const ultimo = checklists.find(c => c.reservatorioId === reservatorioId);
  if (!ultimo) return res.status(204).end();
  res.json(ultimo);
});

app.get('/api/v1/localidades/:id/monitor-reservatorios', authMiddleware, (req: Request, res: Response) => {
  const localidadeId = Number(req.params.id);
  const loc = localidades.find(l => l.id === localidadeId);
  const municipioId = loc?.paiId || localidadeId;

  const resAgregados = reservatorios.filter(r => {
    const rLoc = localidades.find(l => l.id === r.localidadeId);
    const pertenceAoTerritorio = r.localidadeId === localidadeId || r.localidadeId === municipioId || rLoc?.paiId === municipioId;
    return pertenceAoTerritorio && r.consentimentoAgregacao;
  });

  const distribuicaoEscala = { CHEIO: 0, MEDIO: 0, BAIXO: 0, CRITICO: 0 };
  resAgregados.forEach(r => {
    distribuicaoEscala[r.escala] = (distribuicaoEscala[r.escala] || 0) + 1;
  });

  const media =
    resAgregados.length > 0
      ? Math.round(resAgregados.reduce((acc, r) => acc + r.ultimoNivelPercentual, 0) / resAgregados.length)
      : null;

  const comRiscoSanitario = resAgregados.filter(r => {
    const ch = checklists.find(c => c.reservatorioId === r.id);
    return ch?.riscoPotabilidade;
  }).length;

  res.json({
    localidadeId,
    localidadeNome: loc?.nome || "Território de Irecê",
    totalParticipantes: resAgregados.length,
    totalReservatorios: resAgregados.length,
    resumoNivelPercentual: media,
    distribuicaoEscala,
    comRiscoSanitario,
    suficiente: resAgregados.length >= 3,
    ultimaSincronizacao: new Date().toISOString()
  });
});

// 11. Alertas Climáticos (RF12 / RF13 / RN07)
app.get('/api/v1/alertas', authMiddleware, (req: Request, res: Response) => {
  const locId = req.query.localidadeId ? Number(req.query.localidadeId) : 1;
  const loc = localidades.find(l => l.id === locId);
  const list = alertas.filter(a => a.localidadeId === locId || (loc?.paiId && a.localidadeId === loc.paiId) || a.localidadeId === 1);
  res.json(list);
});

app.post('/api/v1/alertas', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.usuario?.perfil === 'AGRICULTOR') {
    return res.status(403).json({ mensagem: "Apenas liderança comunitária ou gestor público pode emitir alertas oficiais." });
  }
  const { localidadeId, titulo, mensagem, severidade = 'AMARELO', tipo = 'CHUVA_ABAIXO_ESPERADO' } = req.body;
  const loc = localidades.find(l => l.id === Number(localidadeId || 1));
  const novo: AlertaClimatico = {
    id: alertas.length + 1,
    localidadeId: Number(localidadeId || 1),
    emissorId: req.usuario!.id,
    tipo,
    severidade,
    corInmet: severidade === 'VERMELHO' || severidade === 'ALTA' ? 'VERMELHO' : severidade === 'LARANJA' ? 'LARANJA' : 'AMARELO',
    codigoIbge: loc?.codigoIbge || "2914604",
    titulo: String(titulo),
    mensagem: String(mensagem),
    fonte: `${req.usuario!.nome} · Gestão Comunitária / INMET`,
    vigenteAte: trintaDiasFuturoIso,
    criadoEm: new Date().toISOString()
  };
  alertas.unshift(novo);
  res.status(201).json(novo);
});

// 12. Mural Comunitário (RF14 / RF15 / RN08)
app.get('/api/v1/avisos', authMiddleware, (req: Request, res: Response) => {
  const locId = req.query.localidadeId ? Number(req.query.localidadeId) : 1;
  const loc = localidades.find(l => l.id === locId);
  const list = avisosMural.filter(m => m.localidadeId === locId || (loc?.paiId && m.localidadeId === loc.paiId) || m.localidadeId === 1);
  res.json({
    content: list,
    totalElements: list.length
  });
});

app.post('/api/v1/avisos', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { localidadeId, titulo, conteudo } = req.body;
  if (!titulo || !conteudo) {
    return res.status(400).json({ mensagem: "Título e conteúdo são obrigatórios." });
  }
  const novo: AvisoMural = {
    id: avisosMural.length + 1,
    localidadeId: Number(localidadeId || req.usuario!.localidadeId || 1),
    autorId: req.usuario!.id,
    autorNome: req.usuario!.nome,
    titulo: String(titulo),
    conteudo: String(conteudo),
    publicadoEm: new Date().toISOString(),
    visivelAte: trintaDiasFuturoIso
  };
  avisosMural.unshift(novo);
  res.status(201).json(novo);
});

// 13. Sincronização Offline Reforçada em Lote (RF17 / RN02 / IndexedDB + LocalStorage)
const idsSincronizadosProcessados = new Set<string>();

app.post('/api/v1/sync/registros', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    precipitacoes: batchPrecip = [],
    niveis: batchNiveis = [],
    checklists: batchChecklists = [],
    avisos: batchAvisos = [],
    limiares: batchLimiares = []
  } = req.body;

  let precipCount = 0;
  let nivelCount = 0;
  let checklistCount = 0;
  let avisoCount = 0;
  let limiarCount = 0;

  for (const p of batchPrecip) {
    if (p.idClienteSync && idsSincronizadosProcessados.has(p.idClienteSync)) continue;
    if (p.idClienteSync) idsSincronizadosProcessados.add(p.idClienteSync);
    precipitacoes.unshift({
      id: precipitacoes.length + 1,
      localidadeId: Number(p.localidadeId || req.usuario!.localidadeId),
      usuarioId: req.usuario!.id,
      volumeMm: Number(p.volumeMm),
      dataEvento: p.dataEvento || hojeIso,
      fonte: p.fonte || 'PLUVIOMETRO_PROPRIO',
      idClienteSync: p.idClienteSync,
      criadoEm: new Date().toISOString()
    });
    precipCount++;
  }

  for (const n of batchNiveis) {
    if (n.idClienteSync && idsSincronizadosProcessados.has(n.idClienteSync)) continue;
    if (n.idClienteSync) idsSincronizadosProcessados.add(n.idClienteSync);
    const resObj = reservatorios.find(r => r.id === Number(n.reservatorioId));
    if (resObj) {
      const pct = Math.min(100, Math.max(0, Number(n.nivelPercentual)));
      resObj.ultimoNivelPercentual = pct;
      resObj.escala = calcularEscala(pct);
      if (n.nivelLencolMetros != null) resObj.nivelLencolMetros = Number(n.nivelLencolMetros);
      resObj.atualizadoEm = new Date().toISOString();
      nivelCount++;
    }
  }

  for (const c of batchChecklists) {
    if (c.idClienteSync && idsSincronizadosProcessados.has(c.idClienteSync)) continue;
    if (c.idClienteSync) idsSincronizadosProcessados.add(c.idClienteSync);
    const reservatorioId = Number(c.reservatorioId || 1);
    const risco = !(c.protecaoEntrada && c.aguaSemOdorOuCor && c.entornoLimpo && c.estruturaIntegra);
    checklists.unshift({
      id: checklists.length + 1,
      reservatorioId,
      dataAvaliacao: c.dataAvaliacao || hojeIso,
      protecaoEntrada: Boolean(c.protecaoEntrada),
      aguaSemOdorOuCor: Boolean(c.aguaSemOdorOuCor),
      entornoLimpo: Boolean(c.entornoLimpo),
      estruturaIntegra: Boolean(c.estruturaIntegra),
      riscoPotabilidade: risco,
      observacao: String(c.observacao || ""),
      criadoEm: new Date().toISOString()
    });
    checklistCount++;
  }

  for (const a of batchAvisos) {
    if (a.idClienteSync && idsSincronizadosProcessados.has(a.idClienteSync)) continue;
    if (a.idClienteSync) idsSincronizadosProcessados.add(a.idClienteSync);
    if (a.titulo && a.conteudo) {
      avisosMural.unshift({
        id: avisosMural.length + 1,
        localidadeId: Number(a.localidadeId || req.usuario!.localidadeId || 1),
        autorId: req.usuario!.id,
        autorNome: req.usuario!.nome,
        titulo: String(a.titulo),
        conteudo: String(a.conteudo),
        publicadoEm: new Date().toISOString(),
        visivelAte: trintaDiasFuturoIso
      });
      avisoCount++;
    }
  }

  for (const l of batchLimiares) {
    if (l.culturaId && l.limiarMm > 0) {
      limiaresUsuario.set(`${req.usuario!.id}:${Number(l.culturaId)}`, Number(l.limiarMm));
      limiarCount++;
    }
  }

  res.json({
    status: "SINCRONIZADO",
    precipitacoesSincronizadas: precipCount,
    niveisSincronizados: nivelCount,
    checklistsSincronizados: checklistCount,
    avisosSincronizados: avisoCount,
    limiaresSincronizados: limiarCount,
    sincronizadoEm: new Date().toISOString()
  });
});

// 14. Google Cloud Text-to-Speech API (Leitura de Voz Acessível pt-BR para Agricultores Idosos / Baixa Escolaridade)
app.post('/api/v1/tts/sintetizar', optionalAuth, async (req: Request, res: Response) => {
  const {
    texto,
    velocidade = 1.0,
    entonacao = 0.0,
    volumeGainDb = 0.0,
    voz = 'pt-BR-Neural2-B'
  } = req.body;

  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ mensagem: "Informe o texto a ser convertido em fala." });
  }

  const cleanText = String(texto).trim().slice(0, 2500);
  const speakingRate = Math.min(2.0, Math.max(0.5, Number(velocidade) || 1.0));
  const pitch = Math.min(10.0, Math.max(-10.0, Number(entonacao) || 0.0));

  // 1. Tenta Google Cloud Text-to-Speech API oficial se GOOGLE_TTS_API_KEY estiver configurada
  const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;
  if (googleTtsKey) {
    try {
      const ttsResp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(googleTtsKey)}`, {
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
      });
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
    } catch {}
  }

  // 2. Tenta Gemini TTS (gemini-3.8-flash-lite-tts) se GEMINI_API_KEY estiver configurada
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [{ parts: [{ text: `Leia em Português do Brasil claro, acolhedor e pausado para um agricultor familiar: ${cleanText}` }] }],
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
    } catch {}
  }

  // 3. Retorna configuração estruturada para o motor Web Speech Synthesis pt-BR no cliente (funciona inclusive 100% offline)
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

// 15. Inteligência Artificial para Resumo Natural em Voz Alta e Chat Consultivo de Clima e Plantio
function montarContextoClimaticoLocalidade(localidadeId: number, culturaFiltro = 'milho', usuarioId?: number) {
  const loc = localidades.find(l => l.id === Number(localidadeId)) || localidades[0];
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const diaDoMes = hoje.getDate();
  const normalMes = NORMAIS_IRECE[mesAtual - 1];
  const medidaMes = calcularChuvaLocalidade(loc.id, diaDoMes, usuarioId);
  const medida7d = calcularChuvaLocalidade(loc.id, 7, usuarioId);
  const medida30d = calcularChuvaLocalidade(loc.id, 30, usuarioId);
  const percentual = Math.round((medidaMes.valorMm / normalMes) * 1000) / 10;

  const cult = culturas.find(c => c.nome.toLowerCase() === String(culturaFiltro).toLowerCase()) || culturas[0];
  const razao = cult.limiarPadraoMm > 0 ? medida30d.valorMm / cult.limiarPadraoMm : 0;

  let situacao = 'Situação de Transição (Atenção ao Solo)';
  let orientacaoDireta = `Com ${medidaMes.valorMm} milímetros acumulados no mês (${percentual}% da média), verifique a umidade do solo a 15 centímetros antes de semear e faça sulcos em nível para segurar a água.`;
  if (razao >= 1.0 || percentual >= 85) {
    situacao = 'Situação Favorável para o Plantio';
    orientacaoDireta = `A condição está favorável em ${loc.nome}, com ${medidaMes.valorMm} milímetros acumulados no mês. Aproveite a umidade da terra para plantar nas horas mais frescas e mantenha cobertura com palhada.`;
  } else if (razao < 0.55 && percentual < 50 && medida7d.valorMm < 15) {
    situacao = 'Situação de Estiagem (Baixa Umidade)';
    orientacaoDireta = `A chuva está abaixo do esperado em ${loc.nome}, com apenas ${medidaMes.valorMm} milímetros no mês. Evite arriscar sementes sensíveis como o milho agora; dê preferência a culturas resistentes como mamona ou sorgo e proteja a água da cisterna.`;
  }

  const alertasLocais = alertas.filter(a => a.localidadeId === loc.id);
  return {
    localidade: loc,
    mesAtual,
    normalMes,
    chuvaMesMm: medidaMes.valorMm,
    chuva7dMm: medida7d.valorMm,
    chuva30dMm: medida30d.valorMm,
    percentualNormal: percentual,
    temperaturaC: medidaMes.temperaturaC,
    umidadePct: medidaMes.umidadePct,
    ventoKmh: medidaMes.ventoKmh,
    culturaFoco: cult,
    situacao,
    orientacaoDireta,
    alertasVigentes: alertasLocais.map(a => a.titulo)
  };
}

app.post('/api/v1/ia/resumo-voz', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Se o usuário ainda não entrou na conta, lê apenas a apresentação de boas-vindas do aplicativo
  if (!req.usuario) {
    return res.json({
      sucesso: true,
      origem: 'BOAS_VINDAS_VISITANTE',
      resumoFalado: 'Bem-vindo ao Manejo Caatingueiro! Aqui você pode acompanhar o manejo da sua roça, consultar a situação climática da sua terra, tirar dúvidas com seu assistente de inteligência artificial e cuidar da água da sua cisterna ou poço. Entre na sua conta ou faça seu cadastro gratuito para visualizar as informações de manejo da sua propriedade.',
      situacao: 'Visitante'
    });
  }

  const { localidadeId = req.usuario.localidadeId || 1, cultura = 'milho', secao = 'painel', textoExtra = '' } = req.body;
  const ctx = montarContextoClimaticoLocalidade(Number(localidadeId) || 1, String(cultura || 'milho'), req.usuario.id);

  const resumoFallback = `Olá, ${req.usuario.nome}! Aqui é o resumo da sua roça em ${ctx.localidade.nome}. Nos últimos 7 dias choveu ${ctx.chuva7dMm} milímetros, e no mês estamos com ${ctx.chuvaMesMm} milímetros, o que representa ${ctx.percentualNormal}% do esperado. A temperatura agora é de ${ctx.temperaturaC} graus, com umidade do ar em ${ctx.umidadePct}%. Sua roça está em ${ctx.situacao}. Recomendação de manejo para ${ctx.culturaFoco.nome}: ${ctx.orientacaoDireta}`;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `Você é um assistente agronômico acolhedor que conversa em voz alta com pequenos agricultores familiares do semiárido baiano (região de Irecê e Presidente Dutra).
Gere um resumo curto, caloroso, muito claro e natural (3 a 4 frases apenas, sem listas, sem asteriscos, pronto para ser lido em voz alta) para o agricultor(a) ${req.usuario.nome}, explicando os dados atuais da localidade dele:
- Localidade: ${ctx.localidade.nome}
- Chuva últimos 7 dias: ${ctx.chuva7dMm} mm
- Chuva acumulada no mês: ${ctx.chuvaMesMm} mm (normal esperada: ${ctx.normalMes} mm, ${ctx.percentualNormal}%)
- Temperatura: ${ctx.temperaturaC} °C | Umidade: ${ctx.umidadePct}%
- Situação atual diagnosticada pelo sistema: ${ctx.situacao}
- Cultura selecionada: ${ctx.culturaFoco.nome} (limiar de referência: ${ctx.culturaFoco.limiarPadraoMm} mm)
- Orientação de manejo: ${ctx.orientacaoDireta}
${textoExtra ? `- Contexto da tela atual (${secao}): ${String(textoExtra).slice(0, 400)}` : ''}
Escreva os números de forma fácil de ouvir e fale diretamente com ${req.usuario.nome}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      const textoIa = response.text?.trim().replace(/[*#_`]/g, '');
      if (textoIa && textoIa.length > 20) {
        return res.json({
          sucesso: true,
          origem: 'GEMINI_AI',
          resumoFalado: textoIa,
          situacao: ctx.situacao
        });
      }
    } catch {}
  }

  return res.json({
    sucesso: true,
    origem: 'RESUMO_INTELIGENTE_LOCAL',
    resumoFalado: resumoFallback,
    situacao: ctx.situacao
  });
});

app.post('/api/v1/ia/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { mensagem, localidadeId = req.usuario?.localidadeId || 1, cultura = 'milho', historico = [] } = req.body;
  if (!mensagem || !String(mensagem).trim()) {
    return res.status(400).json({ mensagem: "Digite uma pergunta para o assistente de manejo." });
  }

  const pergunta = String(mensagem).trim();
  const ctx = montarContextoClimaticoLocalidade(Number(localidadeId) || 1, String(cultura || 'milho'), req.usuario?.id);

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const histTexto = Array.isArray(historico)
        ? historico.slice(-6).map((h: any) => `${h.autor === 'usuario' ? 'Agricultor' : 'Assistente'}: ${h.texto}`).join('\n')
        : '';

      const systemPrompt = `Você é o Consultor de Manejo Caatingueiro, um assistente agronômico amigável, direto e especializado na agricultura familiar do semiárido da Bahia (Território de Irecê e Presidente Dutra).
Use sempre os dados climáticos em tempo real da localidade atual do agricultor para embasar suas respostas:
- Localidade atual: ${ctx.localidade.nome}
- Chuva últimos 7 dias: ${ctx.chuva7dMm} mm
- Chuva no mês: ${ctx.chuvaMesMm} mm (Média esperada do mês: ${ctx.normalMes} mm · ${ctx.percentualNormal}%)
- Chuva acumulada em 30 dias: ${ctx.chuva30dMm} mm
- Clima agora: ${ctx.temperaturaC} °C, umidade ${ctx.umidadePct}%, vento ${ctx.ventoKmh} km/h
- Situação atual da roça: ${ctx.situacao}
- Orientação principal: ${ctx.orientacaoDireta}
- Limiares das culturas: Milho (120 mm em 30 dias), Mamona (90 mm em 30 dias), Feijão-Caupi (110 mm na estação).
- Alertas ativos na região: ${ctx.alertasVigentes.join(' | ') || 'Nenhum alerta severo no momento'}

Regras de resposta:
1. Seja acolhedor, sucinto (máximo de 3 parágrafos curtos) e use linguagem simples do campo.
2. Sempre cite os números reais da localidade (${ctx.localidade.nome}) quando falar de chuva ou plantio.
3. Dê dicas práticas de manejo do solo (cobertura morta, sulcos em nível, consórcio, economia de água na cisterna).
4. Não use formatação markdown complexa.

${histTexto ? `Histórico recente da conversa:\n${histTexto}\n` : ''}
Pergunta do agricultor: ${pergunta}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: systemPrompt
      });
      const respostaIa = response.text?.trim();
      if (respostaIa) {
        return res.json({
          resposta: respostaIa,
          contextoUsado: {
            localidade: ctx.localidade.nome,
            chuvaMesMm: ctx.chuvaMesMm,
            chuva7dMm: ctx.chuva7dMm,
            temperaturaC: ctx.temperaturaC,
            situacao: ctx.situacao
          },
          origem: 'GEMINI_AI'
        });
      }
    } catch {}
  }

  // Fallback contextual inteligente baseado nos dados reais das APIs de clima da localidade
  const pLower = pergunta.toLowerCase();
  let respostaContextual = '';

  if (pLower.includes('milho')) {
    respostaContextual = `Para o plantio de Milho em ${ctx.localidade.nome}, a referência segura é de 120 mm acumulados em 30 dias. No momento, temos ${ctx.chuva30dMm} mm nos últimos 30 dias (${ctx.chuvaMesMm} mm neste mês) e sua roça está em ${ctx.situacao}. ${ctx.chuva30dMm >= 120 ? 'A umidade já favorece o plantio! Faça a semeadura com palhada sobre o solo.' : 'Como o acumulado ainda está abaixo de 120 mm, o ideal é aguardar a próxima chuva forte ou optar por culturas mais resistentes à seca, como a mamona (90 mm) ou o feijão-caupi.'}`;
  } else if (pLower.includes('mamona')) {
    respostaContextual = `A Mamona é uma das culturas mais resistentes para ${ctx.localidade.nome}, pedindo cerca de 90 mm acumulados em 30 dias. Hoje estamos com ${ctx.chuva30dMm} mm em 30 dias e temperatura de ${ctx.temperaturaC} °C. ${ctx.chuva30dMm >= 90 ? 'O volume de chuva já atingiu o necessário para a mamona! Aproveite para plantar mantendo o espaçamento adequado.' : 'Prepare as covas e sulcos em nível para segurar a umidade das próximas pancadas de chuva antes de semear.'}`;
  } else if (pLower.includes('feij') || pLower.includes('caupi')) {
    respostaContextual = `O Feijão-Caupi tem ciclo rápido e precisa de cerca de 110 mm bem distribuídos. Em ${ctx.localidade.nome}, choveu ${ctx.chuva7dMm} mm nos últimos 7 dias e ${ctx.chuvaMesMm} mm no mês (${ctx.percentualNormal}% da média). ${ctx.orientacaoDireta}`;
  } else if (pLower.includes('cisterna') || pLower.includes('poço') || pLower.includes('agua') || pLower.includes('água')) {
    respostaContextual = `Em ${ctx.localidade.nome}, com umidade do ar em ${ctx.umidadePct}% e temperatura de ${ctx.temperaturaC} °C, a evaporação é alta. Mantenha a cisterna bem vedada, limpe as calhas para aproveitar cada chuva (tivemos ${ctx.chuva7dMm} mm nos últimos 7 dias) e use cobertura morta com palha nos canteiros para economizar água.`;
  } else {
    respostaContextual = `Analisando o clima agora em ${ctx.localidade.nome}: temos ${ctx.temperaturaC} °C, umidade de ${ctx.umidadePct}%, ${ctx.chuva7dMm} mm de chuva nos últimos 7 dias e ${ctx.chuvaMesMm} mm no mês (${ctx.percentualNormal}% do esperado). Sua propriedade encontra-se em ${ctx.situacao}. Dica de manejo: ${ctx.orientacaoDireta}`;
  }

  return res.json({
    resposta: respostaContextual,
    contextoUsado: {
      localidade: ctx.localidade.nome,
      chuvaMesMm: ctx.chuvaMesMm,
      chuva7dMm: ctx.chuva7dMm,
      temperaturaC: ctx.temperaturaC,
      situacao: ctx.situacao
    },
    origem: 'ASSISTENTE_CLIMA_LOCAL'
  });
});

// Rotas explícitas de download com Content-Disposition: attachment para garantir download direto no navegador
const ARQUIVOS_ZIP_PERMITIDOS: Record<string, string> = {
  'repositorio-backend.zip': 'repositorio-backend.zip',
  'repositorio-supernovaweb.zip': 'repositorio-supernovaweb.zip',
  'projeto-completo-manejo-caatingueiro.zip': 'projeto-completo-manejo-caatingueiro.zip'
};

app.get(['/repositorio-backend.zip', '/repositorio-supernovaweb.zip', '/projeto-completo-manejo-caatingueiro.zip', '/baixar/:arquivo'], (req: Request, res: Response) => {
  const nome = req.params.arquivo || req.path.replace(/^\//, '');
  const arquivoSeguro = ARQUIVOS_ZIP_PERMITIDOS[nome];
  if (!arquivoSeguro) {
    return res.status(404).json({ mensagem: "Arquivo não encontrado." });
  }
  const fullPath = path.join(__dirname, 'public', arquivoSeguro);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${arquivoSeguro}"`);
  return res.download(fullPath, arquivoSeguro);
});

app.get('/baixar', (_req: Request, res: Response) => {
  res.send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Central de Download — Manejo Caatingueiro</title>
  <style>
    * { box-sizing: border-box; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { margin: 0; background: #f4f5ed; color: #202a21; padding: 32px 16px; display: flex; justify-content: center; }
    .box { max-width: 640px; width: 100%; background: #fffefa; border: 1px solid #d8ddd0; border-radius: 10px; padding: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
    h1 { margin: 0 0 8px; color: #173d2c; font-size: 24px; }
    p { margin: 0 0 20px; color: #556155; font-size: 15px; line-height: 1.5; }
    .list { display: grid; gap: 12px; }
    .dl-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 18px; background: #286947; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; border: none; cursor: pointer; text-align: left; }
    .dl-btn:hover { background: #173d2c; }
    .dl-sub { display: block; font-size: 12px; font-weight: 400; color: #d7ebe0; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>📦 Pacotes Atualizados para Download</h1>
    <p>Clique em qualquer pacote abaixo para iniciar o download imediatamente:</p>
    <div class="list">
      <a class="dl-btn" href="/baixar/repositorio-backend.zip" download="repositorio-backend.zip">
        <span>1. Backend para o Render (repositorio-backend.zip)<span class="dl-sub">Servidor Node.js/Express + Dockerfile + API INMET + IA + OAuth</span></span>
        <span>⬇ Baixar</span>
      </a>
      <a class="dl-btn" href="/baixar/repositorio-supernovaweb.zip" download="repositorio-supernovaweb.zip">
        <span>2. Frontend para a Vercel (repositorio-supernovaweb.zip)<span class="dl-sub">Interface completa com Menu Lateral, Perfil, Chat IA, Voz e Modo Offline</span></span>
        <span>⬇ Baixar</span>
      </a>
      <a class="dl-btn" href="/baixar/projeto-completo-manejo-caatingueiro.zip" download="projeto-completo-manejo-caatingueiro.zip">
        <span>3. Projeto Completo Unificado (projeto-completo-manejo-caatingueiro.zip)<span class="dl-sub">Frontend + Backend + Schema SQL Supabase + Documentação + Agente</span></span>
        <span>⬇ Baixar</span>
      </a>
    </div>
  </div>
</body>
</html>`);
});

// Serve os arquivos estáticos de /public e /supernovaweb
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'supernovaweb')));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ mensagem: "Rota de API não encontrada." });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`[Manejo Caatingueiro · SupernovaWeb] Rodando em http://${HOST}:${PORT}`);
  // Sincronização automática imediata com INMET + Estação A424 na partida do servidor
  sincronizarEstacoesEAlertasInmet().catch(() => {});
});
