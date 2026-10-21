import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'manejo-caatingueiro-jwt-secret-key-2026-min-32-chars';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DADOS EM MEMÓRIA (TERRITÓRIO DE IRECÊ E PRESIDENTE DUTRA - BA) ---
const localidades = [
  { id: 1, nome: "Irecê", tipo: "MUNICIPIO", paiId: null, latitude: -11.3042, longitude: -41.8558 },
  { id: 2, nome: "Presidente Dutra", tipo: "MUNICIPIO", paiId: null, latitude: -11.2958, longitude: -41.9869 },
  { id: 3, nome: "Povoado de Achado (Irecê)", tipo: "POVOADO", paiId: 1, paiNome: "Irecê", latitude: -11.2610, longitude: -41.8210 },
  { id: 4, nome: "Povoado de Umbuzeiro (Irecê)", tipo: "POVOADO", paiId: 1, paiNome: "Irecê", latitude: -11.3412, longitude: -41.8840 },
  { id: 5, nome: "Povoado de Campo Formoso (Pres. Dutra)", tipo: "POVOADO", paiId: 2, paiNome: "Presidente Dutra", latitude: -11.3120, longitude: -41.9650 }
];

const culturas = [
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

const limiaresUsuario = new Map();
const defaultSenhaHash = bcrypt.hashSync("senha123", 10);

const usuarios = [
  {
    id: 1,
    nome: "Ana Carolina Estevão (IFBA)",
    telefone: "74999990000",
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
    senhaHash: defaultSenhaHash,
    perfil: "AGRICULTOR",
    abastecimento: "CISTERNA",
    localidadeId: 3,
    consentimentoLocalizacao: true
  }
];

const hojeIso = new Date().toISOString().slice(0, 10);
const tresDiasAtrasIso = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);
const trintaDiasFuturoIso = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

const precipitacoes = [
  { id: 1, localidadeId: 1, usuarioId: 2, volumeMm: 18.5, dataEvento: hojeIso, fonte: "PLUVIOMETRO_PROPRIO", criadoEm: new Date().toISOString() },
  { id: 2, localidadeId: 1, usuarioId: 2, volumeMm: 14.0, dataEvento: tresDiasAtrasIso, fonte: "PLUVIOMETRO_PROPRIO", criadoEm: new Date().toISOString() }
];

function calcularEscala(pct) {
  if (pct >= 75) return 'CHEIO';
  if (pct >= 40) return 'MEDIO';
  if (pct >= 15) return 'BAIXO';
  return 'CRITICO';
}

const reservatorios = [
  { id: 1, apelido: "Cisterna de Placa da Casa", tipo: "CISTERNA", responsavelId: 2, localidadeId: 1, capacidadeLitros: 16000, ultimoNivelPercentual: 68, escala: "MEDIO", consentimentoAgregacao: true, atualizadoEm: new Date().toISOString() },
  { id: 2, apelido: "Poço Tubular da Roça", tipo: "POCO", responsavelId: 2, localidadeId: 1, capacidadeLitros: 45000, ultimoNivelPercentual: 80, escala: "CHEIO", nivelLencolMetros: 14.5, consentimentoAgregacao: true, atualizadoEm: new Date().toISOString() },
  { id: 3, apelido: "Poço Comunitário Wiliam", tipo: "POCO", responsavelId: 3, localidadeId: 1, capacidadeLitros: 50000, ultimoNivelPercentual: 55, escala: "MEDIO", consentimentoAgregacao: true, atualizadoEm: new Date().toISOString() },
  { id: 4, apelido: "Cisterna Calçadão Luiza", tipo: "CISTERNA", responsavelId: 4, localidadeId: 3, capacidadeLitros: 52000, ultimoNivelPercentual: 82, escala: "CHEIO", consentimentoAgregacao: true, atualizadoEm: new Date().toISOString() },
  { id: 5, apelido: "Cisterna Seu Damião", tipo: "CISTERNA", responsavelId: 5, localidadeId: 3, capacidadeLitros: 16000, ultimoNivelPercentual: 32, escala: "BAIXO", consentimentoAgregacao: true, atualizadoEm: new Date().toISOString() }
];

const checklists = [
  { id: 1, reservatorioId: 1, dataAvaliacao: hojeIso, protecaoEntrada: true, aguaSemOdorOuCor: true, entornoLimpo: true, estruturaIntegra: true, riscoPotabilidade: false, observacao: "Calha limpa e primeiro desvio de água de chuva revisado.", criadoEm: new Date().toISOString() }
];

const alertas = [
  { id: 1, localidadeId: 1, emissorId: 1, tipo: "INICIO_CHUVAS", severidade: "INFO", titulo: "Acompanhamento de Trovoadas em Irecê", mensagem: "Primeiras pancadas registradas na microrregião. Revise calhas e o primeiro desvio das cisternas.", fonte: "Painel Manejo Caatingueiro · Climatologia INMET/CHIRPS", vigenteAte: trintaDiasFuturoIso, criadoEm: new Date().toISOString() },
  { id: 2, localidadeId: 2, emissorId: 1, tipo: "CHUVA_ABAIXO_ESPERADO", severidade: "ATENCAO", titulo: "Atenção à distribuição de chuva em Presidente Dutra", mensagem: "Volume acumulado nos últimos 15 dias exige cautela para o milho; mamona apresenta melhor tolerância.", fonte: "Defesa Civil / Extensão Rural", vigenteAte: trintaDiasFuturoIso, criadoEm: new Date().toISOString() }
];

const avisosMural = [
  { id: 1, localidadeId: 1, autorId: 2, autorNome: "Zé Ronaldo (Agricultor)", titulo: "Troca de Sementes Crioulas de Feijão e Mamona", conteudo: "Disponibilizo sementes selecionadas da última safra para troca no sábado na Associação Comunitária do Achado.", publicadoEm: new Date().toISOString(), visivelAte: trintaDiasFuturoIso },
  { id: 2, localidadeId: 1, autorId: 1, autorNome: "Ana Carolina · Grupo Garimpeiros IFBA", titulo: "Oficina de Validação do Painel Manejo Caatingueiro", conteudo: "Convidamos os agricultores de Irecê e Presidente Dutra para testar o painel hiperlocal e calibrar os limiares das culturas.", publicadoEm: new Date().toISOString(), visivelAte: trintaDiasFuturoIso }
];

const NORMAIS_IRECE = [95, 82, 92, 54, 18, 9, 7, 5, 12, 38, 88, 112];
const openMeteoCache = new Map();

async function ingerirOpenMeteoParaLocalidade(loc) {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const fim = hoje.toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=precipitation_sum&timezone=America%2FBahia&start_date=${inicioMes}&end_date=${fim}`;

    const resp = await fetch(url);
    if (!resp.ok) return false;
    const data = await resp.json();
    const sums = data?.daily?.precipitation_sum || [];
    const totalMes = Math.round(sums.reduce((acc, v) => acc + (Number(v) || 0), 0) * 10) / 10;
    const ultimos7 = Math.round(sums.slice(-7).reduce((acc, v) => acc + (Number(v) || 0), 0) * 10) / 10;

    openMeteoCache.set(loc.id, {
      acumuladoMes: totalMes,
      recente7d: ultimos7,
      fonte: "Open-Meteo API + Pluviômetros Comunitários (Território de Irecê-BA)",
      atualizadoEm: new Date().toISOString()
    });
    return true;
  } catch {
    return false;
  }
}

// --- AUTH MIDDLEWARE ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Token de autenticação não fornecido." });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = usuarios.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ mensagem: "Usuário não encontrado." });
    req.usuario = user;
    next();
  } catch {
    return res.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, JWT_SECRET);
      req.usuario = usuarios.find(u => u.id === payload.id);
    } catch {}
  }
  next();
}

// --- ROTAS DA API ---
app.get('/api/v1/health', (_req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

// 1. Login (RF02)
app.post('/api/v1/auth/login', (req, res) => {
  const { telefone, senha } = req.body;
  if (!telefone || !senha) return res.status(400).json({ mensagem: "Telefone e senha são obrigatórios." });

  const cleanTelefone = String(telefone).replace(/\D/g, "");
  const user = usuarios.find(u => u.telefone.replace(/\D/g, "") === cleanTelefone);
  if (!user || !bcrypt.compareSync(senha, user.senhaHash)) {
    return res.status(401).json({ mensagem: "Telefone ou senha inválidos." });
  }

  const token = jwt.sign({ id: user.id, telefone: user.telefone, perfil: user.perfil }, JWT_SECRET, { expiresIn: '8h' });
  const localidade = localidades.find(l => l.id === user.localidadeId);

  res.json({
    token,
    tipo: "Bearer",
    expiraEm: 28800,
    usuario: {
      id: user.id,
      nome: user.nome,
      perfil: user.perfil,
      localidadeId: user.localidadeId,
      localidadeNome: localidade ? localidade.nome : "Irecê"
    }
  });
});

// 2. Usuários (RF01)
app.post('/api/v1/usuarios', optionalAuth, (req, res) => {
  const { nome, telefone, senha, perfil = 'AGRICULTOR', abastecimento = 'CISTERNA', localidadeId, consentimentoLocalizacao } = req.body;
  if (!nome || !telefone || !senha || !localidadeId) {
    return res.status(400).json({ mensagem: "Preencha todos os campos obrigatórios." });
  }

  const cleanPhone = String(telefone).replace(/\D/g, "");
  if (usuarios.some(u => u.telefone.replace(/\D/g, "") === cleanPhone)) {
    return res.status(409).json({ mensagem: "Já existe um usuário cadastrado com este telefone." });
  }

  const loc = localidades.find(l => l.id === Number(localidadeId));
  if (!loc) return res.status(404).json({ mensagem: "Localidade informada não existe." });

  const newUser = {
    id: usuarios.length + 1,
    nome: String(nome).trim(),
    telefone: cleanPhone,
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

  return res.status(201).json({
    id: newUser.id,
    nome: newUser.nome,
    telefone: newUser.telefone,
    perfil: newUser.perfil,
    abastecimento: newUser.abastecimento,
    localidadeId: newUser.localidadeId,
    localidadeNome: loc.nome,
    consentimentoLocalizacao: newUser.consentimentoLocalizacao
  });
});

app.get('/api/v1/usuarios/me', authMiddleware, (req, res) => {
  const user = req.usuario;
  const loc = localidades.find(l => l.id === user.localidadeId);
  res.json({
    id: user.id,
    nome: user.nome,
    telefone: user.telefone,
    perfil: user.perfil,
    abastecimento: user.abastecimento,
    localidadeId: user.localidadeId,
    localidadeNome: loc ? loc.nome : "Irecê",
    consentimentoLocalizacao: user.consentimentoLocalizacao
  });
});

// 3. Localidades
app.get('/api/v1/localidades', (_req, res) => res.json(localidades));
app.get('/api/v1/localidades/:id', (req, res) => {
  const loc = localidades.find(l => l.id === Number(req.params.id));
  if (!loc) return res.status(404).json({ mensagem: "Localidade não encontrada." });
  res.json(loc);
});

// 4. Culturas e Limiares (RF05 / RN09)
app.get('/api/v1/culturas', (_req, res) => res.json(culturas));
app.put('/api/v1/culturas/:id/limiar-usuario', authMiddleware, (req, res) => {
  const culturaId = Number(req.params.id);
  const cultura = culturas.find(c => c.id === culturaId);
  if (!cultura) return res.status(404).json({ mensagem: "Cultura não encontrada." });
  const limiarMm = Number(req.body.limiarMm);
  if (isNaN(limiarMm) || limiarMm <= 0) return res.status(400).json({ mensagem: "Informe um limiar maior que zero." });

  limiaresUsuario.set(`${req.usuario.id}:${culturaId}`, limiarMm);
  res.json({ culturaId, limiarMm, personalizado: true });
});

// 5. Ingestão Climática Open-Meteo (RF18)
app.post('/api/v1/admin/ingestao/todas', optionalAuth, async (_req, res) => {
  let atualizadas = 0;
  for (const loc of localidades) {
    const ok = await ingerirOpenMeteoParaLocalidade(loc);
    if (ok) atualizadas++;
  }
  res.json({ localidadesProcessadas: localidades.length, localidadesComDadosReais: atualizadas, fonte: "Open-Meteo Weather API", executadoEm: new Date().toISOString() });
});

function calcularChuvaLocalidade(localidadeId, diasAtras) {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() - diasAtras);
  const limiteStr = limite.toISOString().slice(0, 10);

  const obsManuais = precipitacoes
    .filter(p => p.localidadeId === localidadeId && p.dataEvento >= limiteStr)
    .reduce((sum, p) => sum + p.volumeMm, 0);

  const realData = openMeteoCache.get(localidadeId);
  if (realData) {
    const baseExterna = diasAtras <= 7 ? realData.recente7d : realData.acumuladoMes;
    return { valorMm: Math.round((baseExterna + obsManuais) * 10) / 10, fonte: realData.fonte, atualizadoEm: realData.atualizadoEm };
  }

  const mes = hoje.getMonth();
  const normalMes = NORMAIS_IRECE[mes];
  const baseClima = Math.min(1.0, diasAtras / 30.0) * normalMes * 0.55;
  return {
    valorMm: Math.round((obsManuais + baseClima) * 10) / 10,
    fonte: "Climatologia INMET/CHIRPS (1991-2020) + Pluviômetros da Comunidade",
    atualizadoEm: new Date().toISOString()
  };
}

// 6. Painel de Chuva (RF04)
app.get('/api/v1/localidades/:id/painel-chuva', optionalAuth, (req, res) => {
  const localidadeId = Number(req.params.id);
  const loc = localidades.find(l => l.id === localidadeId);
  if (!loc) return res.status(404).json({ mensagem: "Localidade não encontrada." });

  const culturaNome = req.query.cultura ? String(req.query.cultura).trim() : "milho";
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const diaDoMes = hoje.getDate();

  const normalMes = NORMAIS_IRECE[mesAtual - 1];
  const medidaMes = calcularChuvaLocalidade(localidadeId, diaDoMes);
  const medidaRecente = calcularChuvaLocalidade(localidadeId, 7);
  const medidaEstacao = calcularChuvaLocalidade(localidadeId, 45);
  const percentual = Math.round((medidaMes.valorMm / normalMes) * 1000) / 10;

  let comparacaoCultura = null;
  const cult = culturas.find(c => c.nome.toLowerCase() === culturaNome.toLowerCase()) || culturas[0];
  if (cult) {
    let limiar = cult.limiarPadraoMm;
    let personalizado = false;
    if (req.usuario) {
      const custom = limiaresUsuario.get(`${req.usuario.id}:${cult.id}`);
      if (custom != null) { limiar = custom; personalizado = true; }
    }
    const diasJanela = cult.tipoCriterio === 'VOLUME_POR_EVENTO' ? 7 : cult.janelaDias || 30;
    const medidaCultura = calcularChuvaLocalidade(localidadeId, diasJanela);

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

  res.json({
    localidadeId: loc.id,
    localidadeNome: loc.nome,
    ano: hoje.getFullYear(),
    mes: mesAtual,
    acumuladoMesMm: medidaMes.valorMm,
    normalMesMm: normalMes,
    percentualDaNormal: percentual,
    acumuladoEstacaoMm: medidaEstacao.valorMm,
    acumuladoRecenteMm: medidaRecente.valorMm,
    historicoSuficiente: true,
    resumoComparativo: `Choveu ${medidaMes.valorMm} mm neste mês em ${loc.nome}; o normal histórico para o mês é ${normalMes} mm (${percentual}%).`,
    fonte: medidaMes.fonte,
    atualizadoEm: medidaMes.atualizadoEm,
    comparacaoCultura
  });
});

// 7. Sugestão Consultiva de Plantio (RF06 / RN12)
app.get('/api/v1/localidades/:id/sugestao-plantio', optionalAuth, (req, res) => {
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
  const medida = calcularChuvaLocalidade(localidadeId, diasJanela);
  const razao = medida.valorMm / limiar;

  let resultado = "CONSIDERE_CULTURA_ALTERNATIVA";
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
    grauConfianca: 0.9
  });
});

// 8. Precipitações (RF03)
app.post('/api/v1/precipitacoes', authMiddleware, (req, res) => {
  const { localidadeId, volumeMm, dataEvento, fonte = 'PLUVIOMETRO_PROPRIO' } = req.body;
  if (!localidadeId || volumeMm == null || !dataEvento) {
    return res.status(400).json({ mensagem: "Volume, data e localidade são obrigatórios." });
  }
  const nova = {
    id: precipitacoes.length + 1,
    localidadeId: Number(localidadeId),
    usuarioId: req.usuario.id,
    volumeMm: Number(volumeMm),
    dataEvento: String(dataEvento),
    fonte,
    criadoEm: new Date().toISOString()
  };
  precipitacoes.unshift(nova);
  res.status(201).json(nova);
});

app.get('/api/v1/precipitacoes', authMiddleware, (req, res) => {
  const userPrecip = precipitacoes.filter(p => p.usuarioId === req.usuario.id);
  res.json({ content: userPrecip, totalElements: userPrecip.length, totalPages: 1, number: 0, size: 20 });
});

// 9. Reservatórios, Níveis, Checklist Sanitário e Monitor Comunitário (RF07, RF08, RF16, RN15)
app.get('/api/v1/reservatorios', authMiddleware, (req, res) => {
  const userRes = reservatorios.filter(r => r.responsavelId === req.usuario.id);
  res.json(userRes.map(r => ({ ...r, localidadeNome: localidades.find(l => l.id === r.localidadeId)?.nome || "Irecê" })));
});

app.post('/api/v1/reservatorios/:id/niveis', authMiddleware, (req, res) => {
  const reservatorioId = Number(req.params.id);
  const resObj = reservatorios.find(r => r.id === reservatorioId);
  if (!resObj) return res.status(404).json({ mensagem: "Reservatório não encontrado." });

  const nivelNum = Math.min(100, Math.max(0, Number(req.body.nivelPercentual)));
  resObj.ultimoNivelPercentual = nivelNum;
  resObj.escala = calcularEscala(nivelNum);
  if (req.body.nivelLencolMetros != null) resObj.nivelLencolMetros = Number(req.body.nivelLencolMetros);
  resObj.atualizadoEm = new Date().toISOString();

  res.status(201).json({ reservatorioId, nivelPercentual: nivelNum, escala: resObj.escala, dataRegistro: req.body.dataRegistro || hojeIso, status: "GRAVADO" });
});

app.post('/api/v1/reservatorios/:id/checklists', authMiddleware, (req, res) => {
  const reservatorioId = Number(req.params.id);
  const { protecaoEntrada = true, aguaSemOdorOuCor = true, entornoLimpo = true, estruturaIntegra = true, observacao = "" } = req.body;
  const riscoPotabilidade = !(protecaoEntrada && aguaSemOdorOuCor && entornoLimpo && estruturaIntegra);

  const novo = {
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

app.get('/api/v1/reservatorios/:id/checklists/ultimo', authMiddleware, (req, res) => {
  const reservatorioId = Number(req.params.id);
  const ultimo = checklists.find(c => c.reservatorioId === reservatorioId);
  if (!ultimo) return res.status(204).end();
  res.json(ultimo);
});

app.get('/api/v1/localidades/:id/monitor-reservatorios', authMiddleware, (req, res) => {
  const localidadeId = Number(req.params.id);
  const loc = localidades.find(l => l.id === localidadeId);
  const municipioId = loc?.paiId || localidadeId;

  const resAgregados = reservatorios.filter(r => {
    const rLoc = localidades.find(l => l.id === r.localidadeId);
    const pertenceAoTerritorio = r.localidadeId === localidadeId || r.localidadeId === municipioId || rLoc?.paiId === municipioId;
    return pertenceAoTerritorio && r.consentimentoAgregacao;
  });

  const distribuicaoEscala = { CHEIO: 0, MEDIO: 0, BAIXO: 0, CRITICO: 0 };
  resAgregados.forEach(r => { distribuicaoEscala[r.escala] = (distribuicaoEscala[r.escala] || 0) + 1; });

  const media = resAgregados.length > 0
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

// 10. Alertas Climáticos (RF12 / RF13 / RN07)
app.get('/api/v1/alertas', authMiddleware, (req, res) => {
  const locId = req.query.localidadeId ? Number(req.query.localidadeId) : 1;
  const loc = localidades.find(l => l.id === locId);
  const list = alertas.filter(a => a.localidadeId === locId || (loc?.paiId && a.localidadeId === loc.paiId));
  res.json(list);
});

app.post('/api/v1/alertas', authMiddleware, (req, res) => {
  if (req.usuario?.perfil === 'AGRICULTOR') {
    return res.status(403).json({ mensagem: "Apenas liderança comunitária ou gestor público pode emitir alertas oficiais." });
  }
  const { localidadeId, titulo, mensagem, severidade = 'ATENCAO', tipo = 'CHUVA_ABAIXO_ESPERADO' } = req.body;
  const novo = {
    id: alertas.length + 1,
    localidadeId: Number(localidadeId || 1),
    emissorId: req.usuario.id,
    tipo,
    severidade,
    titulo: String(titulo),
    mensagem: String(mensagem),
    fonte: `${req.usuario.nome} · Gestão Comunitária`,
    vigenteAte: trintaDiasFuturoIso,
    criadoEm: new Date().toISOString()
  };
  alertas.unshift(novo);
  res.status(201).json(novo);
});

// 11. Mural Comunitário (RF14 / RF15 / RN08)
app.get('/api/v1/avisos', authMiddleware, (req, res) => {
  const locId = req.query.localidadeId ? Number(req.query.localidadeId) : 1;
  const loc = localidades.find(l => l.id === locId);
  const list = avisosMural.filter(m => m.localidadeId === locId || (loc?.paiId && m.localidadeId === loc.paiId));
  res.json({ content: list, totalElements: list.length });
});

app.post('/api/v1/avisos', authMiddleware, (req, res) => {
  const { localidadeId, titulo, conteudo } = req.body;
  if (!titulo || !conteudo) return res.status(400).json({ mensagem: "Título e conteúdo são obrigatórios." });

  const novo = {
    id: avisosMural.length + 1,
    localidadeId: Number(localidadeId || req.usuario.localidadeId || 1),
    autorId: req.usuario.id,
    autorNome: req.usuario.nome,
    titulo: String(titulo),
    conteudo: String(conteudo),
    publicadoEm: new Date().toISOString(),
    visivelAte: trintaDiasFuturoIso
  };
  avisosMural.unshift(novo);
  res.status(201).json(novo);
});

// 12. Sincronização Offline em Lote (RF17)
app.post('/api/v1/sync/registros', authMiddleware, (req, res) => {
  const { precipitacoes: batchPrecip = [], niveis: batchNiveis = [] } = req.body;
  let precipCount = 0;
  let nivelCount = 0;

  for (const p of batchPrecip) {
    precipitacoes.unshift({
      id: precipitacoes.length + 1,
      localidadeId: Number(p.localidadeId || req.usuario.localidadeId),
      usuarioId: req.usuario.id,
      volumeMm: Number(p.volumeMm),
      dataEvento: p.dataEvento || hojeIso,
      fonte: p.fonte || 'PLUVIOMETRO_PROPRIO',
      criadoEm: new Date().toISOString()
    });
    precipCount++;
  }

  for (const n of batchNiveis) {
    const resObj = reservatorios.find(r => r.id === Number(n.reservatorioId));
    if (resObj) {
      const pct = Math.min(100, Math.max(0, Number(n.nivelPercentual)));
      resObj.ultimoNivelPercentual = pct;
      resObj.escala = calcularEscala(pct);
      resObj.atualizadoEm = new Date().toISOString();
      nivelCount++;
    }
  }

  res.json({ status: "SINCRONIZADO", precipitacoesSincronizadas: precipCount, niveisSincronizados: nivelCount });
});

// Resposta na raiz caso acessem o backend diretamente pelo navegador
app.get('/', (_req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; padding: 30px; text-align: center; background: #f4f5ed; color: #173d2c;">
        <h2>API Manejo Caatingueiro Operacional no Render</h2>
        <p>Servidor ativo respondendo em <code>/api/v1/*</code>.</p>
      </body>
    </html>
  `);
});

app.listen(Number(PORT), HOST, () => {
  console.log(`[Manejo Caatingueiro API] Servidor rodando na porta ${PORT} (${HOST})`);
  ingerirOpenMeteoParaLocalidade(localidades[0]).catch(() => {});
});
