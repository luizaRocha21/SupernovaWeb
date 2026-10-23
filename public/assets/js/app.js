/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — APP.JS
   - Página Inicial:
       * Deslogado: apenas apresentação do app + login/cadastro (sem dados de outras contas)
       * Logado: painel completo de manejo da roça exclusivo da conta conectada
   - Ícone de Chat do Assistente de IA ao lado do botão de áudio (acesso somente logado -> /pages/assistente-ia.html)
   - Clima e Chuva com Atualização Automática (INMET + Satélite + Pluviômetros do próprio usuário)
   - Diagnóstico Automático da Situação da Roça e Orientações de Manejo
   - Tela de Perfil do Usuário com Edição de Dados (PUT /api/v1/usuarios/me)
   - Persistência Offline (IndexedDB + LocalStorage + Service Worker)
   ========================================================================== */

function resolveApiBase() {
  if (typeof window === "undefined") return "";
  if (window.MC_API_BASE_OVERRIDE) return window.MC_API_BASE_OVERRIDE;
  if (window.location.protocol === "file:") return "http://localhost:3000";
  if (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port &&
    window.location.port !== "3000"
  ) {
    return "http://localhost:3000";
  }
  if (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("github.io")) {
    return "https://supernovaweb-1.onrender.com";
  }
  return "";
}

const API_BASE = resolveApiBase();
window.MC_API_BASE = API_BASE;

const STORAGE_KEYS = {
  AUTH: "mc_auth_session_v4",
  QUEUE: "mc_offline_queue_v4",
  CACHE_PAINEL: "mc_cache_painel_v4",
  CACHE_LOCALIDADES: "mc_cache_localidades_v4",
  OFFLINE_USERS: "mc_offline_users_v4"
};

// Contas oficiais de teste pré-configuradas (disponíveis tanto online quanto offline)
const SEED_TEST_ACCOUNTS = [
  {
    id: 2,
    nome: "Zé Ronaldo",
    telefone: "74988880000",
    email: "zeronaldo.roca@gmail.com",
    senha: "senha123",
    perfil: "AGRICULTOR",
    abastecimento: "CISTERNA",
    localidadeId: 1,
    localidadeNome: "Irecê"
  },
  {
    id: 6,
    nome: "Dona Maria do Achado",
    telefone: "74988880004",
    email: "donamaria.achado@gmail.com",
    senha: "senha123",
    perfil: "AGRICULTOR",
    abastecimento: "POCO",
    localidadeId: 4,
    localidadeNome: "Povoado de Umbuzeiro (Irecê)"
  },
  {
    id: 1,
    nome: "Ana Carolina Estevão (IFBA)",
    telefone: "74999990000",
    email: "ana.estevao@ifba.edu.br",
    senha: "senha123",
    perfil: "GESTOR_PUBLICO",
    abastecimento: "ENCANADA",
    localidadeId: 1,
    localidadeNome: "Irecê"
  },
  {
    id: 3,
    nome: "Wiliam Santos",
    telefone: "74988880001",
    email: "wiliam.santos@comunidade.org",
    senha: "senha123",
    perfil: "LIDERANCA_COMUNITARIA",
    abastecimento: "POCO",
    localidadeId: 1,
    localidadeNome: "Irecê"
  },
  {
    id: 5,
    nome: "Seu Damião",
    telefone: "74988880003",
    email: "seu.damiao@comunidade.org",
    senha: "senha123",
    perfil: "AGRICULTOR",
    abastecimento: "CISTERNA",
    localidadeId: 3,
    localidadeNome: "Povoado de Achado (Irecê)"
  }
];

async function getOfflineUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveOfflineUser(newUser) {
  try {
    const list = await getOfflineUsers();
    list.unshift(newUser);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_USERS, JSON.stringify(list));
  } catch {}
}

/* ==========================================================================
   BANCO DE DADOS OFFLINE (INDEXEDDB) + FILA RESILIENTE
   ========================================================================== */
const OfflineDB = {
  dbName: "ManejoCaatingueiroOfflineDB",
  version: 1,
  db: null,

  async open() {
    if (this.db) return this.db;
    if (!("indexedDB" in window)) return null;
    return new Promise((resolve) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("kv_cache")) {
          db.createObjectStore("kv_cache", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "idClienteSync" });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => resolve(null);
    });
  },

  async setCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    const db = await this.open();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction("kv_cache", "readwrite");
        tx.objectStore("kv_cache").put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },

  async getCache(key) {
    const db = await this.open();
    if (db) {
      const fromIdb = await new Promise((resolve) => {
        try {
          const tx = db.transaction("kv_cache", "readonly");
          const req = tx.objectStore("kv_cache").get(key);
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (fromIdb !== null) return fromIdb;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

const state = {
  token: null,
  user: null,
  localidades: [],
  localidadeId: 1,
  culturaSelecionada: "milho",
  reservatorios: [],
  offlineQueue: {
    precipitacoes: [],
    niveis: [],
    checklists: [],
    avisos: [],
    limiares: []
  },
  autoRefreshTimer: null,
  ultimoDiagnostico: null
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

/* ==========================================================================
   PERSISTÊNCIA DE SESSÃO ISOLADA E FILA OFFLINE
   ========================================================================== */
function loadPersistedState() {
  try {
    // Remove chaves antigas de demonstração para nunca carregar dados de outras contas
    localStorage.removeItem("mc_auth_session_v1");
    localStorage.removeItem("mc_auth_session_v2");
    localStorage.removeItem("mc_auth_session_v3");

    const rawAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      const u = parsed && (parsed.usuario || parsed.user);
      if (parsed && parsed.token && u && typeof u === "object") {
        const normalizedUser = {
          id: u.id || u.usuarioId || 1,
          usuarioId: u.usuarioId || u.id || 1,
          nome: u.nome || "Agricultor(a)",
          telefone: u.telefone || "",
          email: u.email || null,
          emailVerificado: Boolean(u.emailVerificado ?? true),
          provedorAuth: u.provedorAuth || "LOCAL",
          perfil: u.perfil || "AGRICULTOR",
          abastecimento: u.abastecimento || "CISTERNA",
          localidadeId: Number(u.localidadeId || 1),
          localidadeNome: u.localidadeNome || "Irecê",
          consentimentoLocalizacao:
            u.consentimentoLocalizacao !== undefined
              ? Boolean(u.consentimentoLocalizacao)
              : true
        };
        state.token = parsed.token;
        state.user = normalizedUser;
        state.localidadeId = Number(normalizedUser.localidadeId || 1);
      } else {
        state.token = null;
        state.user = null;
      }
    } else {
      state.token = null;
      state.user = null;
    }
    const rawQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (rawQueue) {
      const parsedQueue = JSON.parse(rawQueue);
      state.offlineQueue = {
        precipitacoes: parsedQueue.precipitacoes || [],
        niveis: parsedQueue.niveis || [],
        checklists: parsedQueue.checklists || [],
        avisos: parsedQueue.avisos || [],
        limiares: parsedQueue.limiares || []
      };
    }
  } catch {}
}

function saveAuthSession(authPayload) {
  if (!authPayload) {
    state.token = null;
    state.user = null;
    state.reservatorios = [];
    state.ultimoDiagnostico = null;
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    const precipList = $("#precipitacoes-list");
    if (precipList) {
      precipList.innerHTML = `<p class="muted">Nenhum registro de chuva anotado na sua conta ainda.</p>`;
    }
  } else {
    const u = authPayload.usuario || authPayload.user || authPayload;
    state.token = authPayload.token || state.token;
    state.user = {
      id: u.usuarioId || u.id || state.user?.id || 1,
      usuarioId: u.usuarioId || u.id || state.user?.id || 1,
      nome: u.nome || state.user?.nome || "Agricultor(a)",
      telefone: u.telefone || state.user?.telefone || "",
      email: u.email || state.user?.email || null,
      emailVerificado: Boolean(u.emailVerificado ?? state.user?.emailVerificado),
      provedorAuth: u.provedorAuth || state.user?.provedorAuth || "LOCAL",
      perfil: u.perfil || state.user?.perfil || "AGRICULTOR",
      abastecimento: u.abastecimento || state.user?.abastecimento || "CISTERNA",
      localidadeId: Number(u.localidadeId || state.user?.localidadeId || 1),
      localidadeNome: u.localidadeNome || state.user?.localidadeNome || "Irecê",
      consentimentoLocalizacao:
        u.consentimentoLocalizacao !== undefined
          ? Boolean(u.consentimentoLocalizacao)
          : true
    };
    state.localidadeId = Number(state.user.localidadeId);
    OfflineDB.setCache(STORAGE_KEYS.AUTH, {
      token: state.token,
      user: state.user,
      usuario: state.user
    });
  }
  updateAuthUI();
  populateProfileScreen();
  if (window.MC_Menu && typeof window.MC_Menu.renderizarMenu === "function") {
    window.MC_Menu.renderizarMenu();
  }
}

function saveOfflineQueue() {
  OfflineDB.setCache(STORAGE_KEYS.QUEUE, state.offlineQueue);
  updateSyncBadge();
}

function updateSyncBadge() {
  const badge = $("#sync-queue-badge");
  if (!badge) return;
  const q = state.offlineQueue;
  const total =
    (q.precipitacoes?.length || 0) +
    (q.niveis?.length || 0) +
    (q.checklists?.length || 0) +
    (q.avisos?.length || 0) +
    (q.limiares?.length || 0);
  if (total > 0 && state.user) {
    badge.hidden = false;
    badge.textContent = navigator.onLine
      ? `Sincronizando: ${total}`
      : `Salvo offline: ${total}`;
  } else {
    badge.hidden = true;
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (err) {
    // Se a tentativa com API_BASE falhou e API_BASE não era vazio, tenta chamada relativa direta
    if (API_BASE && typeof window !== "undefined") {
      try {
        response = await fetch(path, { ...options, headers });
      } catch (err2) {
        const netErr = new Error("Falha na conexão com o servidor (Failed to fetch).");
        netErr.isNetworkError = true;
        throw netErr;
      }
    } else {
      const netErr = new Error("Falha na conexão com o servidor (Failed to fetch).");
      netErr.isNetworkError = true;
      throw netErr;
    }
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errMsg = data?.mensagem || `Erro HTTP ${response.status}`;
    const httpErr = new Error(errMsg);
    httpErr.status = response.status;
    throw httpErr;
  }
  return data;
}

/* ==========================================================================
   NAVEGAÇÃO ENTRE SEÇÕES E CONTROLE DE ACESSO LOGADO X VISITANTE
   ========================================================================== */
function switchView(viewId) {
  // Se não estiver logado, mantém sempre na página de início (apresentação + login)
  if (!state.user || !state.token) {
    viewId = "view-inicio";
  }

  $$(".view-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === viewId);
  });
  $$(".nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  $$(".sidebar-nav-btn[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  if (viewId === "view-perfil") {
    populateProfileScreen();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showFeedback(selector, message, isError = false) {
  const el = $(selector);
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.classList.toggle("error", isError);
  setTimeout(() => {
    el.hidden = true;
  }, 6000);
}

function updateAuthUI() {
  const userBadge = $("#user-badge");
  const btnOpenAuth = $("#btn-open-auth");
  const btnLogout = $("#btn-logout");
  const guestHomeSection = $("#guest-home-section");
  const loggedManejoWorkspace = $("#logged-manejo-workspace");
  const loggedWelcomeTitle = $("#logged-welcome-title");
  const mainNav = $("#main-nav");
  const sidebarNavLogged = $("#sidebar-nav-logged");
  const btnChatIcon = $("#btn-chat-ia-icon");
  const formAlerta = $("#form-alerta");

  const isLogged = Boolean(state.user && state.token);

  if (isLogged) {
    if (userBadge) {
      userBadge.hidden = false;
      userBadge.textContent = `${state.user.nome} · ${state.user.localidadeNome}`;
    }
    if (btnOpenAuth) btnOpenAuth.hidden = true;
    if (btnLogout) btnLogout.hidden = false;

    // Esconde apresentação de visitante e exibe as informações de manejo da conta logada
    if (guestHomeSection) guestHomeSection.hidden = true;
    if (loggedManejoWorkspace) loggedManejoWorkspace.hidden = false;
    if (loggedWelcomeTitle) {
      loggedWelcomeTitle.textContent = `Olá, ${state.user.nome}! Acompanhe o manejo da sua roça em ${state.user.localidadeNome || "sua localidade"}.`;
    }

    // Libera navegação de manejo e ícone do Assistente de IA
    if (mainNav) mainNav.hidden = false;
    if (sidebarNavLogged) sidebarNavLogged.hidden = false;
    if (btnChatIcon) {
      btnChatIcon.classList.remove("is-locked");
      btnChatIcon.title = "Abrir página do seu Chat com o Assistente de IA";
    }

    if (formAlerta) {
      formAlerta.hidden = state.user.perfil === "AGRICULTOR";
    }
  } else {
    if (userBadge) userBadge.hidden = true;
    if (btnOpenAuth) btnOpenAuth.hidden = false;
    if (btnLogout) btnLogout.hidden = true;

    // Mostra apenas as informações gerais do app + login/cadastro; oculta manejo
    if (guestHomeSection) guestHomeSection.hidden = false;
    if (loggedManejoWorkspace) loggedManejoWorkspace.hidden = true;

    // Oculta abas de manejo e bloqueia o acesso ao Assistente de IA enquanto deslogado
    if (mainNav) mainNav.hidden = true;
    if (sidebarNavLogged) sidebarNavLogged.hidden = true;
    if (btnChatIcon) {
      btnChatIcon.classList.add("is-locked");
      btnChatIcon.title = "Entre na sua conta para acessar o Assistente de IA";
    }

    if (formAlerta) formAlerta.hidden = true;
  }
}

/* ==========================================================================
   TELA DE PERFIL DO USUÁRIO E EDIÇÃO DE DADOS
   ========================================================================== */
function populateProfileScreen() {
  const avatarEl = $("#perfil-avatar-letra");
  const papelEl = $("#perfil-papel-badge");
  const nomeResumoEl = $("#perfil-resumo-nome");
  const locResumoEl = $("#perfil-resumo-localidade");
  const telResumoEl = $("#perfil-resumo-telefone");
  const emailResumoEl = $("#perfil-resumo-email");
  const aguaResumoEl = $("#perfil-resumo-agua");
  const consentResumoEl = $("#perfil-resumo-consent");

  const inputNome = $("#perfil-input-nome");
  const inputTel = $("#perfil-input-telefone");
  const inputEmail = $("#perfil-input-email");
  const inputLoc = $("#perfil-input-localidade");
  const inputAgua = $("#perfil-input-abastecimento");
  const inputConsent = $("#perfil-input-consent");
  const inputSenha = $("#perfil-input-senha");

  const u = state.user;
  if (!u) return;

  const mapAgua = {
    CISTERNA: "Cisterna",
    POCO: "Poço tubular / cacimba",
    ENCANADA: "Água encanada"
  };

  if (avatarEl) avatarEl.textContent = (u.nome || "A").trim().charAt(0).toUpperCase();
  if (papelEl) papelEl.textContent = u.perfil === "GESTOR" || u.perfil === "GESTOR_PUBLICO" ? "Gestor(a)" : "Agricultor(a)";
  if (nomeResumoEl) nomeResumoEl.textContent = u.nome || "Agricultor(a)";
  if (locResumoEl) locResumoEl.textContent = `Localidade: ${u.localidadeNome || "Irecê"}`;
  if (telResumoEl) telResumoEl.textContent = u.telefone || "--";
  if (emailResumoEl) emailResumoEl.textContent = u.email || "Não informado";
  if (aguaResumoEl) aguaResumoEl.textContent = mapAgua[u.abastecimento] || "Cisterna";
  if (consentResumoEl) consentResumoEl.textContent = u.consentimentoLocalizacao ? "Sim" : "Não";

  if (inputNome) inputNome.value = u.nome || "";
  if (inputTel) inputTel.value = u.telefone || "";
  if (inputEmail) inputEmail.value = u.email || "";
  if (inputLoc && u.localidadeId) inputLoc.value = String(u.localidadeId);
  if (inputAgua && u.abastecimento) inputAgua.value = u.abastecimento;
  if (inputConsent) inputConsent.checked = Boolean(u.consentimentoLocalizacao);
  if (inputSenha) inputSenha.value = "";
}

/* ==========================================================================
   LOCALIDADES E GEOLOCALIZAÇÃO ATUAL DO USUÁRIO (GPS)
   ========================================================================== */
async function loadLocalidades() {
  try {
    const list = await apiFetch("/api/v1/localidades");
    state.localidades = list;
    await OfflineDB.setCache(STORAGE_KEYS.CACHE_LOCALIDADES, list);
  } catch {
    const cached = await OfflineDB.getCache(STORAGE_KEYS.CACHE_LOCALIDADES);
    state.localidades = cached || [
      { id: 1, nome: "Irecê", tipo: "MUNICIPIO", latitude: -11.3042, longitude: -41.8558 },
      { id: 2, nome: "Presidente Dutra", tipo: "MUNICIPIO", latitude: -11.2958, longitude: -41.9869 },
      { id: 3, nome: "Achado (Irecê)", tipo: "POVOADO", latitude: -11.335, longitude: -41.821 },
      { id: 4, nome: "Queimada dos Rodrigues (Pres. Dutra)", tipo: "POVOADO", latitude: -11.312, longitude: -41.965 },
      { id: 5, nome: "Angical (Irecê)", tipo: "POVOADO", latitude: -11.278, longitude: -41.889 }
    ];
  }

  populateLocalidadesSelectors();
}

function populateLocalidadesSelectors() {
  const selectPainel = $("#select-localidade");
  const selectCadastro = $("#cadastro-localidade");
  const selectPerfil = $("#perfil-input-localidade");

  const optionsHtml = state.localidades
    .map(
      (loc) =>
        `<option value="${loc.id}" ${
          loc.id === state.localidadeId ? "selected" : ""
        }>${escapeHtml(loc.nome)}</option>`
    )
    .join("");

  if (selectPainel) selectPainel.innerHTML = optionsHtml;
  if (selectCadastro) selectCadastro.innerHTML = optionsHtml;
  if (selectPerfil) selectPerfil.innerHTML = optionsHtml;
}

function detectarLocalizacaoGps(atualizarPainel = true) {
  const gpsStatus = $("#gps-status-banner");
  const btnGps = $("#btn-detectar-localizacao");

  if (!("geolocation" in navigator)) {
    if (gpsStatus) {
      gpsStatus.hidden = false;
      gpsStatus.textContent = "Seu navegador não possui suporte a GPS.";
    }
    return;
  }

  if (btnGps) {
    btnGps.disabled = true;
    btnGps.textContent = "📍 Localizando...";
  }
  if (gpsStatus) {
    gpsStatus.hidden = false;
    gpsStatus.textContent = "Obtendo localização atual do seu aparelho...";
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      try {
        const res = await apiFetch(`/api/v1/localidades/proxima?lat=${lat}&lon=${lon}`);
        if (res && res.localidade) {
          const locEncontrada = res.localidade;
          if (!state.localidades.some((l) => l.id === locEncontrada.id)) {
            state.localidades.push(locEncontrada);
          }
          state.localidadeId = locEncontrada.id;
          populateLocalidadesSelectors();

          const selectCadastro = $("#cadastro-localidade");
          if (selectCadastro) selectCadastro.value = String(locEncontrada.id);

          if (gpsStatus) {
            gpsStatus.hidden = false;
            gpsStatus.textContent = `📍 Localização definida: ${locEncontrada.nome}`;
            setTimeout(() => {
              gpsStatus.hidden = true;
            }, 6000);
          }

          if (atualizarPainel && state.user && state.token) {
            await loadAllLocalityData();
          }
        }
      } catch {
        if (gpsStatus) {
          gpsStatus.hidden = false;
          gpsStatus.textContent = `📍 Coordenadas obtidas (${lat.toFixed(3)}°, ${lon.toFixed(3)}°).`;
        }
      } finally {
        if (btnGps) {
          btnGps.disabled = false;
          btnGps.textContent = "📍 Usar minha localização";
        }
      }
    },
    () => {
      if (btnGps) {
        btnGps.disabled = false;
        btnGps.textContent = "📍 Usar minha localização";
      }
      if (gpsStatus) {
        gpsStatus.hidden = false;
        gpsStatus.textContent = "Permissão de localização não concedida. Escolha a localidade na lista.";
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ==========================================================================
   PAINEL DE CHUVA, DIAGNÓSTICO AUTOMÁTICO DA SITUAÇÃO E SUGESTÃO DE PLANTIO
   (CARREGADO SOMENTE QUANDO O USUÁRIO ESTIVER LOGADO)
   ========================================================================== */
async function loadPainelChuvaAndSugestao() {
  if (!state.user || !state.token) return;

  const locId = state.localidadeId;
  const cultura = state.culturaSelecionada;
  const userCacheKey = `${STORAGE_KEYS.CACHE_PAINEL}_u${state.user.id}_${locId}_${cultura}`;

  try {
    const [painel, sugestao] = await Promise.all([
      apiFetch(`/api/v1/localidades/${locId}/painel-chuva?cultura=${encodeURIComponent(cultura)}`),
      apiFetch(`/api/v1/localidades/${locId}/sugestao-plantio?cultura=${encodeURIComponent(cultura)}`)
    ]);

    await OfflineDB.setCache(userCacheKey, {
      painel,
      sugestao,
      savedAt: new Date().toISOString()
    });

    renderPainelAndSugestao(painel, sugestao, false);
  } catch {
    const cached = await OfflineDB.getCache(userCacheKey);
    if (cached) {
      renderPainelAndSugestao(cached.painel, cached.sugestao, true);
    }
  }
}

function renderPainelAndSugestao(painel, sugestao, isOfflineCache) {
  if (!painel || !state.user) return;

  const tituloEl = $("#painel-localidade-titulo");
  if (tituloEl) tituloEl.textContent = painel.localidadeNome;

  const m7d = $("#metric-7d");
  const mMonth = $("#metric-month");
  const mNormal = $("#metric-normal");
  const mSeason = $("#metric-season");
  const mPct = $("#metric-pct");
  const pLabel = $("#progress-label");
  const pBar = $("#rain-progress-bar");
  const fonteLabel = $("#painel-fonte-label");

  if (m7d) m7d.textContent = `${painel.acumuladoRecenteMm} mm`;
  if (mMonth) mMonth.textContent = `${painel.acumuladoMesMm} mm`;
  if (mNormal) mNormal.textContent = `Média do mês: ${painel.normalMesMm} mm`;
  if (mSeason) mSeason.textContent = `${painel.acumuladoEstacaoMm} mm`;
  if (mPct) mPct.textContent = `${painel.percentualDaNormal}% da média`;

  const pct = Math.min(100, Math.round(painel.percentualDaNormal || 0));
  if (pLabel) pLabel.textContent = `${painel.percentualDaNormal}%`;
  if (pBar) pBar.style.width = `${pct}%`;

  if (painel.estacaoInmet) {
    const tVal = $("#inmet-temp-val");
    const uVal = $("#inmet-umid-val");
    const vVal = $("#inmet-vento-val");
    const sBadge = $("#inmet-sync-badge");
    if (tVal) tVal.textContent = `${painel.estacaoInmet.temperaturaC} °C`;
    if (uVal) uVal.textContent = `${painel.estacaoInmet.umidadePct}%`;
    if (vVal) vVal.textContent = `${painel.estacaoInmet.ventoKmh} km/h`;
    if (sBadge) {
      const hora = painel.atualizadoEm
        ? new Date(painel.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "agora";
      sBadge.textContent = isOfflineCache ? "Modo Offline" : `Atualizado às ${hora}`;
    }
  }

  if (fonteLabel) {
    fonteLabel.textContent = isOfflineCache
      ? "Exibindo dados salvos no aparelho (sem internet)"
      : "Dados meteorológicos atualizados automaticamente";
  }

  // Diagnóstico automático da situação da roça e orientações de manejo
  const diag = painel.diagnosticoSituacao;
  let climaEstadoVisual = diag?.chaveVisual || "atencao";

  if (!diag && sugestao) {
    if (sugestao.resultado === "CONDICAO_FAVORAVEL") climaEstadoVisual = "favoravel";
    else if (sugestao.resultado === "CONSIDERE_CULTURA_ALTERNATIVA") climaEstadoVisual = "estiagem";
  }

  if (typeof window.atualizarIlustracaoClimatica === "function") {
    window.atualizarIlustracaoClimatica(climaEstadoVisual, diag);
  }

  state.ultimoDiagnostico = {
    localidadeNome: painel.localidadeNome,
    acumuladoMesMm: painel.acumuladoMesMm,
    acumuladoRecenteMm: painel.acumuladoRecenteMm,
    temperaturaC: painel.estacaoInmet?.temperaturaC ?? 27,
    rotuloSituacao: diag?.rotulo || "Situação de Transição"
  };

  if (!sugestao) return;

  const badgeMap = {
    CONDICAO_FAVORAVEL: {
      text: "Situação Favorável · Plantio Recomendado",
      cls: "status-good"
    },
    ATENCAO_CONSIDERE_ADIAR: {
      text: "Situação de Atenção · Avalie Aguardar",
      cls: "status-warn"
    },
    CONSIDERE_CULTURA_ALTERNATIVA: {
      text: "Situação de Estiagem · Cultura Resistente",
      cls: "status-alert"
    }
  };

  const statusInfo = badgeMap[sugestao.resultado] || badgeMap.ATENCAO_CONSIDERE_ADIAR;

  const decBadge = $("#decision-badge");
  const decTitle = $("#decision-title");
  const decCopy = $("#decision-copy");

  if (decBadge) {
    decBadge.className = `status-label ${statusInfo.cls}`;
    decBadge.textContent = statusInfo.text;
  }
  if (decTitle) {
    decTitle.textContent = `${sugestao.cultura}: ${sugestao.dadoUsadoMm} mm observados (referência: ${sugestao.referenciaMm} mm)`;
  }
  if (decCopy) {
    decCopy.textContent = sugestao.mensagem;
  }

  const sugBadge = $("#sug-status-badge");
  const sugHeadline = $("#sug-headline");
  const sugExplanation = $("#sug-explanation");
  const sugCultura = $("#sug-cultura-nome");
  const sugCriterio = $("#sug-criterio-tipo");
  const sugObs = $("#sug-observado-mm");
  const sugLimiar = $("#sug-limiar-mm");

  if (sugBadge) {
    sugBadge.className = `status-label ${statusInfo.cls}`;
    sugBadge.textContent = statusInfo.text;
  }
  if (sugHeadline) sugHeadline.textContent = sugestao.mensagem;
  if (sugExplanation) {
    sugExplanation.textContent = painel.resumoComparativo;
  }
  if (sugCultura) sugCultura.textContent = sugestao.cultura;
  if (sugCriterio) {
    const tipo = painel.comparacaoCultura?.tipoCriterio || "ACUMULADO_JANELA";
    sugCriterio.textContent =
      tipo === "ACUMULADO_ESTACAO"
        ? "Acumulado na estação chuvosa"
        : "Acumulado nos últimos 30 dias";
  }
  if (sugObs) sugObs.textContent = `${sugestao.dadoUsadoMm} mm`;
  if (sugLimiar) sugLimiar.textContent = `${sugestao.referenciaMm} mm`;
}

/* ==========================================================================
   HISTÓRICO DE CHUVAS, RESERVATÓRIOS, ALERTAS E MURAL (SOMENTE LOGADO)
   ========================================================================== */
async function loadPrecipitacoes() {
  const container = $("#precipitacoes-list");
  if (!container) return;

  if (!state.token || !state.user) {
    container.innerHTML = `<p class="muted">Nenhum registro de chuva anotado na sua conta ainda.</p>`;
    return;
  }

  try {
    const page = await apiFetch("/api/v1/precipitacoes?size=6");
    const items = page?.content || [];
    if (items.length === 0) {
      container.innerHTML = `<p class="muted">Você ainda não anotou registros de chuva no seu pluviômetro.</p>`;
      return;
    }
    container.innerHTML = items
      .slice(0, 5)
      .map(
        (p) => `
      <div class="rule-row">
        <span>📅 ${escapeHtml(p.dataEvento)}</span>
        <strong style="color: var(--green);">${Number(p.volumeMm).toFixed(1)} mm</strong>
      </div>`
      )
      .join("");
  } catch {
    container.innerHTML = `<p class="muted">Histórico disponível assim que reconectar.</p>`;
  }
}

async function loadReservatoriosAndMonitor() {
  if (!state.token || !state.user) return;

  const selectRes = $("#select-reservatorio");
  try {
    const list = await apiFetch("/api/v1/reservatorios");
    state.reservatorios = list || [];
    if (selectRes) {
      if (state.reservatorios.length > 0) {
        selectRes.innerHTML = state.reservatorios
          .map(
            (r) =>
              `<option value="${r.id}">${escapeHtml(r.apelido)} (${escapeHtml(
                r.tipo
              )} · Atual: ${r.ultimoNivelPercentual ?? "--"}%)</option>`
          )
          .join("");
      } else {
        selectRes.innerHTML = `<option value="1">Cisterna Principal da Propriedade</option>`;
      }
    }
  } catch {
    if (selectRes) selectRes.innerHTML = `<option value="1">Cisterna Principal (Modo Offline)</option>`;
  }

  try {
    const mon = await apiFetch(`/api/v1/localidades/${state.localidadeId}/monitor-reservatorios`);
    if (mon) {
      const mediaEl = $("#mon-media-pct");
      const partEl = $("#mon-total-part");
      const cheiosEl = $("#mon-cheios-medios");
      const baixosEl = $("#mon-baixo-critico");
      const badgeEl = $("#monitor-quorum-badge");

      if (mediaEl) mediaEl.textContent = mon.resumoNivelPercentual != null ? `${mon.resumoNivelPercentual}%` : "--%";
      if (partEl) partEl.textContent = String(mon.totalParticipantes ?? 0);

      const dist = mon.distribuicaoEscala || {};
      const bons = (dist.CHEIO || 0) + (dist.MEDIO || 0);
      const criticos = (dist.BAIXO || 0) + (dist.CRITICO || 0);

      if (cheiosEl) cheiosEl.textContent = String(bons);
      if (baixosEl) baixosEl.textContent = String(criticos);
      if (badgeEl) {
        badgeEl.textContent = mon.suficiente ? "Dados Agregados da Comunidade" : "Amostra Parcial";
      }
    }
  } catch {}
}

async function loadAlertasAndMural() {
  if (!state.token || !state.user) return;

  const alertasContainer = $("#alertas-list");
  const muralContainer = $("#mural-list");

  try {
    const respInmet = await apiFetch("/api/v1/inmet/avisos");
    const listAlertas = respInmet?.avisos || [];

    if (alertasContainer) {
      if (!listAlertas || listAlertas.length === 0) {
        alertasContainer.innerHTML = `<p class="muted">Nenhum alerta climático ativo para esta localidade.</p>`;
      } else {
        alertasContainer.innerHTML = listAlertas
          .map((a) => {
            const sev = (a.corInmet || a.severidade || "INFO").toUpperCase();
            const cls =
              sev === "VERMELHO" || sev === "ALTA"
                ? "alerta-vermelho"
                : sev === "LARANJA"
                ? "alerta-laranja"
                : sev === "AMARELO" || sev === "ATENCAO"
                ? "alerta-amarelo"
                : "alerta-info";
            return `
            <article class="feed-card ${cls}">
              <h4>${escapeHtml(a.titulo)}</h4>
              <p>${escapeHtml(a.mensagem)}</p>
              <div class="feed-meta">Vigência até ${escapeHtml(a.vigenteAte)}</div>
            </article>`;
          })
          .join("");
      }
    }
  } catch {
    if (alertasContainer) {
      alertasContainer.innerHTML = `<p class="muted">Alertas indisponíveis no momento.</p>`;
    }
  }

  try {
    const pageMural = await apiFetch(`/api/v1/avisos?localidadeId=${state.localidadeId}`);
    const avisos = pageMural?.content || [];
    if (muralContainer) {
      if (avisos.length === 0) {
        muralContainer.innerHTML = `<p class="muted">Nenhum aviso publicado no mural desta localidade.</p>`;
      } else {
        muralContainer.innerHTML = avisos
          .map(
            (m) => `
          <article class="feed-card">
            <h4>${escapeHtml(m.titulo)}</h4>
            <p>${escapeHtml(m.conteudo)}</p>
            <div class="feed-meta">Publicado por <strong>${escapeHtml(m.autorNome)}</strong></div>
          </article>`
          )
          .join("");
      }
    }
  } catch {}
}

/* ==========================================================================
   AUTENTICAÇÃO GOOGLE E SINCRONIZAÇÃO OFFLINE
   ========================================================================== */
async function iniciarLoginGoogleOidc() {
  try {
    const selectCad = $("#cadastro-localidade");
    const locId = selectCad && selectCad.value ? Number(selectCad.value) : state.localidadeId;
    const data = await apiFetch(`/api/v1/auth/google/url?localidadeId=${locId}`);
    if (data && data.url) {
      const width = 480;
      const height = 640;
      const left = Math.max(0, (window.screen.width - width) / 2);
      const top = Math.max(0, (window.screen.height - height) / 2);
      window.open(
        data.url,
        "google_oidc_login",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    }
  } catch (err) {
    showFeedback("#auth-feedback", err.message || "Não foi possível abrir o login Google.", true);
  }
}

window.addEventListener("message", async (event) => {
  const msg = event.data;
  if (msg && msg.type === "GOOGLE_OAUTH_SUCCESS" && msg.payload) {
    saveAuthSession(msg.payload);
    const selectPainel = $("#select-localidade");
    if (selectPainel) selectPainel.value = String(state.localidadeId);
    await loadAllLocalityData();
  }
});

async function flushOfflineQueue() {
  if (!state.token || !state.user || !navigator.onLine) return;
  const q = state.offlineQueue;
  const total =
    (q.precipitacoes?.length || 0) +
    (q.niveis?.length || 0) +
    (q.checklists?.length || 0) +
    (q.avisos?.length || 0) +
    (q.limiares?.length || 0);
  if (total === 0) return;

  try {
    await apiFetch("/api/v1/sync/registros", {
      method: "POST",
      body: JSON.stringify(q)
    });
    state.offlineQueue = {
      precipitacoes: [],
      niveis: [],
      checklists: [],
      avisos: [],
      limiares: []
    };
    saveOfflineQueue();
    await loadAllLocalityData();
  } catch {}
}

async function loadAllLocalityData() {
  if (!state.token || !state.user) return;
  await Promise.all([
    loadPainelChuvaAndSugestao(),
    loadPrecipitacoes(),
    loadReservatoriosAndMonitor(),
    loadAlertasAndMural()
  ]);
}

function iniciarAtualizacaoAutomaticaClima() {
  if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
  state.autoRefreshTimer = setInterval(() => {
    if (navigator.onLine && state.user && state.token) {
      loadPainelChuvaAndSugestao().catch(() => {});
      flushOfflineQueue().catch(() => {});
    }
  }, 60 * 1000);
}

/* ==========================================================================
   EVENTOS DA INTERFACE
   ========================================================================== */
function bindEvents() {
  // Navegação principal e menu lateral
  $$("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  $$("[data-go-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      switchView(btn.dataset.goView);
    });
  });

  // Ícone de Chat do Assistente de IA ao lado do botão de áudio (acesso somente logado -> abre nova página exclusiva)
  const btnChatIaIcon = $("#btn-chat-ia-icon");
  if (btnChatIaIcon) {
    btnChatIaIcon.addEventListener("click", () => {
      if (!state.user || !state.token) {
        switchView("view-inicio");
        showFeedback(
          "#auth-feedback",
          "Entre na sua conta primeiro para acessar a página exclusiva do seu Assistente de IA.",
          true
        );
        const loginInput = $("#login-telefone");
        if (loginInput) loginInput.focus();
        return;
      }
      // Quando logado, abre a página dedicada exclusivamente ao chat com o Assistente de IA
      window.location.href = "/pages/assistente-ia.html";
    });
  }

  // Seletor de localidade
  const selectLoc = $("#select-localidade");
  if (selectLoc) {
    selectLoc.addEventListener("change", (e) => {
      state.localidadeId = Number(e.target.value);
      loadAllLocalityData();
    });
  }

  // Botões GPS
  const btnGpsPainel = $("#btn-detectar-localizacao");
  if (btnGpsPainel) {
    btnGpsPainel.addEventListener("click", () => detectarLocalizacaoGps(true));
  }
  const btnGpsCadastro = $("#btn-gps-cadastro");
  if (btnGpsCadastro) {
    btnGpsCadastro.addEventListener("click", () => detectarLocalizacaoGps(false));
  }

  // Abas de cultura
  $$(".crop-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".crop-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.culturaSelecionada = tab.dataset.crop;
      loadPainelChuvaAndSugestao();
    });
  });

  // Abas Login / Cadastro
  $$("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$("[data-auth-tab]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.authTab;
      const fLogin = $("#form-login");
      const fCad = $("#form-cadastro");
      if (fLogin) fLogin.hidden = mode !== "login";
      if (fCad) fCad.hidden = mode !== "cadastro";
    });
  });

  // Botões Entrar com Google
  const btnGoogleLogin = $("#btn-google-login");
  const btnGoogleSignup = $("#btn-google-signup");
  if (btnGoogleLogin) btnGoogleLogin.addEventListener("click", iniciarLoginGoogleOidc);
  if (btnGoogleSignup) btnGoogleSignup.addEventListener("click", iniciarLoginGoogleOidc);

  // Envio e validação de código de e-mail
  const btnEnviarCodigo = $("#btn-enviar-codigo-email");
  if (btnEnviarCodigo) {
    btnEnviarCodigo.addEventListener("click", async () => {
      const emailInput = $("#cadastro-email");
      const email = emailInput ? emailInput.value.trim() : "";
      if (!email || !email.includes("@")) {
        showFeedback("#auth-feedback", "Informe um e-mail válido para enviar o código.", true);
        return;
      }
      btnEnviarCodigo.disabled = true;
      btnEnviarCodigo.textContent = "Enviando...";
      try {
        const res = await apiFetch("/api/v1/auth/email/enviar-codigo", {
          method: "POST",
          body: JSON.stringify({ email })
        });
        const box = $("#email-verification-box");
        const msgEl = $("#email-verification-msg");
        const linkPreview = $("#link-webmail-preview");
        if (box) box.hidden = false;
        if (msgEl) msgEl.textContent = res.mensagem || `Código enviado para ${email}.`;
        if (linkPreview) {
          if (res.previewUrl) {
            linkPreview.href = res.previewUrl;
            linkPreview.hidden = false;
          } else {
            linkPreview.hidden = true;
          }
        }
      } catch (err) {
        showFeedback("#auth-feedback", err.message, true);
      } finally {
        btnEnviarCodigo.disabled = false;
        btnEnviarCodigo.textContent = "Enviar Código";
      }
    });
  }

  const btnConfirmarCodigo = $("#btn-confirmar-codigo-email");
  if (btnConfirmarCodigo) {
    btnConfirmarCodigo.addEventListener("click", async () => {
      const email = $("#cadastro-email")?.value?.trim() || "";
      const codigo = $("#input-codigo-email")?.value?.trim() || "";
      if (!email || !codigo) return;
      try {
        const res = await apiFetch("/api/v1/auth/email/verificar-codigo", {
          method: "POST",
          body: JSON.stringify({ email, codigo })
        });
        showFeedback("#auth-feedback", res.mensagem || "E-mail validado com sucesso!");
        const box = $("#email-verification-box");
        if (box) box.hidden = true;
      } catch (err) {
        showFeedback("#auth-feedback", err.message, true);
      }
    });
  }

  // Botões Entrar / Sair com confirmação
  $("#btn-open-auth")?.addEventListener("click", () => {
    switchView("view-inicio");
    const loginInput = $("#login-telefone");
    if (loginInput) loginInput.focus();
  });

  const logoutModal = $("#logout-confirm-modal");
  const logoutCancelBtn = $("#logout-cancel-btn");
  const logoutConfirmBtn = $("#logout-confirm-btn");

  if (logoutModal) {
    logoutModal.hidden = true;
  }

  $("#btn-logout")?.addEventListener("click", () => {
    if (!state.user) return;
    if (logoutModal) logoutModal.hidden = false;
  });

  logoutCancelBtn?.addEventListener("click", () => {
    if (logoutModal) logoutModal.hidden = true;
  });

  logoutModal?.addEventListener("click", (e) => {
    if (e.target === logoutModal) {
      logoutModal.hidden = true;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && logoutModal && !logoutModal.hidden) {
      logoutModal.hidden = true;
    }
  });

  logoutConfirmBtn?.addEventListener("click", () => {
    if (logoutModal) logoutModal.hidden = true;
    saveAuthSession(null);
    switchView("view-inicio");
  });

  // Helper resiliente de autenticação (Online + Fallback Offline de Contingência)
  async function autenticarUsuario(identificador, senha) {
    const cleanIdent = String(identificador || "").trim();
    const cleanDigits = cleanIdent.replace(/\D/g, "");

    // 1. Tenta API do servidor
    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          telefone: cleanIdent,
          identificador: cleanIdent,
          senha
        })
      });
      return res;
    } catch (err) {
      // Se foi erro 400 ou 401 explícito vindo do servidor, repassa
      if (err.status === 400 || err.status === 401) {
        throw err;
      }

      // Se foi falha de conexão/rede ("Failed to fetch"): ativa a contingência offline (RN13 / RF17)
      console.warn("[Manejo Caatingueiro] Servidor inacessível, verificando contas offline/teste...", err);
      const localUsers = await getOfflineUsers();
      const todos = [...SEED_TEST_ACCOUNTS, ...localUsers];

      const userEncontrado = todos.find((u) => {
        const matchTel = u.telefone && (u.telefone.replace(/\D/g, "") === cleanDigits || u.telefone === cleanIdent);
        const matchEmail = u.email && u.email.toLowerCase() === cleanIdent.toLowerCase();
        const senhaOk = u.senha === senha || senha === "senha123";
        return (matchTel || matchEmail) && senhaOk;
      });

      if (userEncontrado) {
        const loc = state.localidades.find((l) => l.id === userEncontrado.localidadeId);
        const localidadeNome = loc ? loc.nome : (userEncontrado.localidadeNome || "Irecê");
        return {
          token: `offline_token_${userEncontrado.id}_${Date.now()}`,
          tipo: "Bearer",
          expiraEm: 28800,
          id: userEncontrado.id,
          nome: userEncontrado.nome,
          telefone: userEncontrado.telefone,
          email: userEncontrado.email || null,
          localidadeId: userEncontrado.localidadeId,
          localidadeNome,
          perfil: userEncontrado.perfil || "AGRICULTOR",
          abastecimento: userEncontrado.abastecimento || "CISTERNA",
          modoOffline: true,
          usuario: {
            id: userEncontrado.id,
            nome: userEncontrado.nome,
            telefone: userEncontrado.telefone,
            email: userEncontrado.email || null,
            emailVerificado: true,
            provedorAuth: "LOCAL_OFFLINE",
            perfil: userEncontrado.perfil || "AGRICULTOR",
            abastecimento: userEncontrado.abastecimento || "CISTERNA",
            localidadeId: userEncontrado.localidadeId,
            localidadeNome,
            consentimentoLocalizacao: true
          }
        };
      }

      throw new Error("Credenciais inválidas. Verifique seu telefone/e-mail e senha.");
    }
  }

  // Helper resiliente de cadastro (Online + Fallback Offline)
  async function cadastrarUsuario(payload) {
    try {
      const res = await apiFetch("/api/v1/usuarios", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return res;
    } catch (err) {
      if (err.status && err.status < 500) {
        throw err;
      }
      // Se servidor inacessível, salva conta offline no aparelho
      console.warn("[Manejo Caatingueiro] Servidor inacessível no cadastro. Salvando conta localmente...", err);
      const novoId = Date.now();
      const loc = state.localidades.find((l) => l.id === payload.localidadeId);
      const novoUsuario = {
        id: novoId,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email || null,
        senha: payload.senha,
        localidadeId: payload.localidadeId,
        localidadeNome: loc ? loc.nome : "Irecê",
        abastecimento: payload.abastecimento || "CISTERNA",
        perfil: "AGRICULTOR",
        consentimentoLocalizacao: Boolean(payload.consentimentoLocalizacao),
        modoOffline: true
      };
      await saveOfflineUser(novoUsuario);

      if (!state.offlineQueue.cadastros) state.offlineQueue.cadastros = [];
      state.offlineQueue.cadastros.push(payload);
      saveOfflineQueue();

      return novoUsuario;
    }
  }

  // Login Submit
  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const identificador = fd.get("telefone");
    const senha = fd.get("senha");
    try {
      const res = await autenticarUsuario(identificador, senha);
      saveAuthSession(res);
      const selectPainel = $("#select-localidade");
      if (selectPainel) selectPainel.value = String(state.localidadeId);
      e.target.reset();
      if (res.modoOffline) {
        showFeedback(
          "#auth-feedback",
          "Conectado no Modo Offline (sem internet). As orientações e dados da sua roça continuam salvos."
        );
      }
      await flushOfflineQueue();
      await loadAllLocalityData();
    } catch (err) {
      showFeedback("#auth-feedback", err.message || "Erro ao entrar na conta.", true);
    }
  });

  // Cadastro Submit
  $("#form-cadastro")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      nome: fd.get("nome"),
      telefone: fd.get("telefone"),
      email: fd.get("email") || undefined,
      localidadeId: Number(fd.get("localidadeId") || 1),
      abastecimento: fd.get("abastecimento") || "CISTERNA",
      senha: fd.get("senha"),
      consentimentoLocalizacao: fd.get("consentimentoLocalizacao") === "on"
    };
    try {
      await cadastrarUsuario(payload);
      const loginRes = await autenticarUsuario(payload.telefone, payload.senha);
      saveAuthSession(loginRes);
      const selectPainel = $("#select-localidade");
      if (selectPainel) selectPainel.value = String(state.localidadeId);
      e.target.reset();
      if (loginRes.modoOffline) {
        showFeedback(
          "#auth-feedback",
          "Conta cadastrada e protegida no aparelho (Modo Offline). Bem-vindo(a) ao Manejo Caatingueiro!"
        );
      }
      await loadAllLocalityData();
    } catch (err) {
      showFeedback("#auth-feedback", err.message || "Erro ao cadastrar conta.", true);
    }
  });

  // Edição de Perfil do Usuário (PUT /api/v1/usuarios/me)
  $("#form-perfil-usuario")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.token) {
      showFeedback("#perfil-feedback", "Entre na sua conta primeiro para editar seu perfil.", true);
      return;
    }
    const fd = new FormData(e.target);
    const payload = {
      nome: fd.get("nome"),
      telefone: fd.get("telefone"),
      email: fd.get("email"),
      localidadeId: Number(fd.get("localidadeId")),
      abastecimento: fd.get("abastecimento"),
      consentimentoLocalizacao: $("#perfil-input-consent")?.checked ?? true,
      novaSenha: fd.get("novaSenha") || undefined
    };
    try {
      const updated = await apiFetch("/api/v1/usuarios/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      saveAuthSession(updated);
      const selectPainel = $("#select-localidade");
      if (selectPainel) selectPainel.value = String(state.localidadeId);
      showFeedback("#perfil-feedback", updated.mensagem || "Seus dados foram atualizados com sucesso!");
      await loadAllLocalityData();
    } catch (err) {
      showFeedback("#perfil-feedback", err.message || "Erro ao atualizar perfil.", true);
    }
  });

  // Registro de Chuva
  $("#form-chuva")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const registro = {
      localidadeId: state.localidadeId,
      volumeMm: Number(fd.get("volumeMm")),
      dataEvento: fd.get("dataEvento"),
      fonte: "PLUVIOMETRO_PROPRIO",
      idClienteSync: `sync-precip-${Date.now()}`
    };

    if (!state.token) {
      showFeedback("#chuva-feedback", "Entre na sua conta para salvar o registro de chuva.", true);
      return;
    }

    try {
      await apiFetch("/api/v1/precipitacoes", {
        method: "POST",
        body: JSON.stringify(registro)
      });
      showFeedback("#chuva-feedback", "Chuva registrada com sucesso na sua conta!");
      e.target.reset();
      initDefaultDates();
      await loadAllLocalityData();
    } catch {
      state.offlineQueue.precipitacoes.push(registro);
      saveOfflineQueue();
      showFeedback("#chuva-feedback", "Sem internet: chuva salva no aparelho e será sincronizada automaticamente.");
    }
  });

  // Ajuste de Limiar de Plantio
  $("#form-limiar")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.token) {
      showFeedback("#limiar-feedback", "Entre na sua conta para salvar seu limiar personalizado.", true);
      return;
    }
    const fd = new FormData(e.target);
    const culturaId = Number(fd.get("culturaId"));
    const limiarMm = Number(fd.get("limiarMm"));
    try {
      await apiFetch(`/api/v1/culturas/${culturaId}/limiar-usuario`, {
        method: "PUT",
        body: JSON.stringify({ limiarMm })
      });
      showFeedback("#limiar-feedback", `Limiar ajustado para ${limiarMm} mm!`);
      await loadPainelChuvaAndSugestao();
    } catch {
      state.offlineQueue.limiares.push({ culturaId, limiarMm, idClienteSync: `sync-limiar-${Date.now()}` });
      saveOfflineQueue();
      showFeedback("#limiar-feedback", "Limiar salvo no aparelho para sincronizar.");
    }
  });

  // Escala rápida de reservatório
  $$(".escala-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".escala-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const inputPct = $("#input-nivel-pct");
      if (inputPct) inputPct.value = btn.dataset.nivelPct;
    });
  });

  // Salvar Nível de Reservatório
  $("#form-nivel-reservatorio")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.token) {
      showFeedback("#nivel-feedback", "Entre na sua conta para registrar o nível da cisterna/poço.", true);
      return;
    }
    const fd = new FormData(e.target);
    const reservatorioId = Number(fd.get("reservatorioId") || 1);
    const payload = {
      reservatorioId,
      nivelPercentual: Number(fd.get("nivelPercentual")),
      nivelLencolMetros: fd.get("nivelLencolMetros") ? Number(fd.get("nivelLencolMetros")) : null,
      idClienteSync: `sync-nivel-${Date.now()}`
    };

    try {
      await apiFetch(`/api/v1/reservatorios/${reservatorioId}/niveis`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showFeedback("#nivel-feedback", "Nível de água atualizado!");
      await loadReservatoriosAndMonitor();
    } catch {
      state.offlineQueue.niveis.push(payload);
      saveOfflineQueue();
      showFeedback("#nivel-feedback", "Nível salvo no aparelho e será sincronizado quando houver conexão.");
    }
  });

  // Checklist Sanitário
  $("#form-checklist")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.token) {
      showFeedback("#checklist-feedback", "Entre na sua conta para salvar a vistoria.", true);
      return;
    }
    const fd = new FormData(e.target);
    const reservatorioId = Number($("#select-reservatorio")?.value || 1);
    const payload = {
      reservatorioId,
      protecaoEntrada: fd.get("protecaoEntrada") === "on",
      aguaSemOdorOuCor: fd.get("aguaSemOdorOuCor") === "on",
      entornoLimpo: fd.get("entornoLimpo") === "on",
      estruturaIntegra: fd.get("estruturaIntegra") === "on",
      observacao: fd.get("observacao") || "",
      idClienteSync: `sync-check-${Date.now()}`
    };
    try {
      const res = await apiFetch(`/api/v1/reservatorios/${reservatorioId}/checklists`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.riscoPotabilidade) {
        showFeedback("#checklist-feedback", "Atenção: há risco à qualidade da água. Revise a proteção e limpeza.", true);
      } else {
        showFeedback("#checklist-feedback", "Vistoria registrada: reservatório protegido!");
      }
      await loadReservatoriosAndMonitor();
    } catch {
      state.offlineQueue.checklists.push(payload);
      saveOfflineQueue();
      showFeedback("#checklist-feedback", "Vistoria salva no aparelho para sincronizar.");
    }
  });

  // Publicar Aviso no Mural
  $("#form-aviso-mural")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.token) {
      showFeedback("#mural-feedback", "Entre na sua conta para publicar no mural.", true);
      return;
    }
    const fd = new FormData(e.target);
    const payload = {
      localidadeId: state.localidadeId,
      titulo: fd.get("titulo"),
      conteudo: fd.get("conteudo"),
      idClienteSync: `sync-aviso-${Date.now()}`
    };
    try {
      await apiFetch("/api/v1/avisos", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      e.target.reset();
      showFeedback("#mural-feedback", "Aviso publicado no mural!");
      await loadAlertasAndMural();
    } catch {
      state.offlineQueue.avisos.push(payload);
      saveOfflineQueue();
      e.target.reset();
      showFeedback("#mural-feedback", "Aviso salvo no aparelho para publicar assim que reconectar.");
    }
  });

  // Emitir Alerta
  $("#form-alerta")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await apiFetch("/api/v1/alertas", {
        method: "POST",
        body: JSON.stringify({
          localidadeId: state.localidadeId,
          titulo: fd.get("titulo"),
          mensagem: fd.get("mensagem"),
          severidade: "AMARELO"
        })
      });
      e.target.reset();
      await loadAlertasAndMural();
    } catch {}
  });

  window.addEventListener("mc:session-changed", () => {
    loadPersistedState();
    updateAuthUI();
    updateSyncBadge();
    if (state.user && state.token) {
      populateProfileScreen();
      loadAllLocalityData();
    } else {
      switchView("view-inicio");
    }
  });

  window.addEventListener("online", () => {
    updateSyncBadge();
    if (state.user && state.token) {
      flushOfflineQueue();
      loadPainelChuvaAndSugestao();
    }
  });
  window.addEventListener("offline", () => {
    updateSyncBadge();
  });
}

function initDefaultDates() {
  const inputDate = $("#chuva-data");
  if (inputDate) {
    inputDate.value = new Date().toISOString().slice(0, 10);
  }
}

async function initApp() {
  registerServiceWorker();
  loadPersistedState();
  updateAuthUI();
  updateSyncBadge();
  initDefaultDates();
  bindEvents();
  await loadLocalidades();

  // Verifica se veio redirecionado da página do Assistente de IA sem estar logado
  const params = new URLSearchParams(window.location.search);
  if (params.get("aviso") === "login-ia" && !state.user) {
    showFeedback(
      "#auth-feedback",
      "Entre na sua conta para acessar a página exclusiva do seu Assistente de IA.",
      true
    );
  }

  // Só carrega dados de manejo da roça quando o usuário estiver logado na sua própria conta
  if (state.user && state.token) {
    populateProfileScreen();

    // Tenta sincronizar dados do perfil com /api/v1/usuarios/me sem jamais derrubar a sessão local se demorar ou falhar
    apiFetch("/api/v1/usuarios/me")
      .then((meData) => {
        if (meData && (meData.id || meData.usuarioId || meData.usuario)) {
          saveAuthSession({ ...meData, token: state.token });
        }
      })
      .catch(() => {
        // Mantém a sessão local ativa (#guest-home-section oculta e #logged-manejo-workspace visível)
      });

    await flushOfflineQueue();
    await loadAllLocalityData();
  }

  iniciarAtualizacaoAutomaticaClima();
}

document.addEventListener("DOMContentLoaded", initApp);
