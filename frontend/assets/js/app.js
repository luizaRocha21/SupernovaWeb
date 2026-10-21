/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — APP.JS
   - Clima e Chuva com Atualização Automática (INMET + Satélite + Pluviômetros)
   - Diagnóstico Automático da Situação da Roça e Orientações de Manejo
   - Login / Cadastro Sucinto com Google OAuth 2.0 e Validação de E-mail
   - Tela de Perfil do Usuário com Edição de Dados (PUT /api/v1/usuarios/me)
   - Chat Assistente de Plantio Integrado à API de Clima e IA (/api/v1/ia/chat)
   - Persistência Offline (IndexedDB + LocalStorage + Service Worker)
   ========================================================================== */

const API_BASE =
  window.location.hostname.includes("vercel.app") ||
  window.location.hostname.includes("github.io")
    ? "https://supernovaweb-1.onrender.com"
    : "";

window.MC_API_BASE = API_BASE;

const STORAGE_KEYS = {
  AUTH: "mc_auth_session_v2",
  QUEUE: "mc_offline_queue_v2",
  CACHE_PAINEL: "mc_cache_painel_v2",
  CACHE_LOCALIDADES: "mc_cache_localidades_v2"
};

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
  chatHistory: [],
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
   PERSISTÊNCIA DE SESSÃO E FILA OFFLINE
   ========================================================================== */
function loadPersistedState() {
  try {
    const rawAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      state.token = parsed.token;
      state.user = parsed.user;
      if (parsed.user?.localidadeId) {
        state.localidadeId = Number(parsed.user.localidadeId);
      }
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
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  } else {
    state.token = authPayload.token || state.token;
    state.user = {
      id: authPayload.usuarioId || authPayload.id || state.user?.id || 2,
      nome: authPayload.nome,
      telefone: authPayload.telefone || state.user?.telefone || "",
      email: authPayload.email || null,
      emailVerificado: Boolean(authPayload.emailVerificado),
      provedorAuth: authPayload.provedorAuth || "LOCAL",
      perfil: authPayload.perfil || "AGRICULTOR",
      abastecimento: authPayload.abastecimento || "CISTERNA",
      localidadeId: authPayload.localidadeId || 1,
      localidadeNome: authPayload.localidadeNome || "Irecê",
      consentimentoLocalizacao:
        authPayload.consentimentoLocalizacao !== undefined
          ? Boolean(authPayload.consentimentoLocalizacao)
          : true
    };
    state.localidadeId = Number(state.user.localidadeId);
    OfflineDB.setCache(STORAGE_KEYS.AUTH, { token: state.token, user: state.user });
  }
  updateAuthUI();
  populateProfileScreen();
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
  if (total > 0) {
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errMsg = data?.mensagem || `Erro HTTP ${response.status}`;
    throw new Error(errMsg);
  }
  return data;
}

/* ==========================================================================
   NAVEGAÇÃO ENTRE SEÇÕES E MENU LATERAL
   ========================================================================== */
function switchView(viewId) {
  $$(".view-section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === viewId);
  });
  $$(".nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  $$(".sidebar-nav-btn").forEach((btn) => {
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
  const authPanel = $("#auth-panel");
  const formAlerta = $("#form-alerta");

  if (state.user) {
    if (userBadge) {
      userBadge.hidden = false;
      userBadge.textContent = `${state.user.nome} · ${state.user.localidadeNome}`;
    }
    if (btnOpenAuth) btnOpenAuth.hidden = true;
    if (btnLogout) btnLogout.hidden = false;
    if (authPanel) authPanel.hidden = true;

    if (formAlerta) {
      formAlerta.hidden = state.user.perfil === "AGRICULTOR";
    }
  } else {
    if (userBadge) userBadge.hidden = true;
    if (btnOpenAuth) btnOpenAuth.hidden = false;
    if (btnLogout) btnLogout.hidden = true;
    if (authPanel) authPanel.hidden = false;
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
  if (!u) {
    if (avatarEl) avatarEl.textContent = "V";
    if (papelEl) papelEl.textContent = "Visitante";
    if (nomeResumoEl) nomeResumoEl.textContent = "Entre na sua conta";
    if (locResumoEl) locResumoEl.textContent = "Faça login para editar seu perfil";
    if (telResumoEl) telResumoEl.textContent = "--";
    if (emailResumoEl) emailResumoEl.textContent = "--";
    return;
  }

  const mapAgua = {
    CISTERNA: "Cisterna",
    POCO: "Poço tubular / cacimba",
    ENCANADA: "Água encanada"
  };

  if (avatarEl) avatarEl.textContent = (u.nome || "A").trim().charAt(0).toUpperCase();
  if (papelEl) papelEl.textContent = u.perfil === "GESTOR" ? "Gestor(a)" : "Agricultor(a)";
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

          if (atualizarPainel) {
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
   ========================================================================== */
async function loadPainelChuvaAndSugestao() {
  const locId = state.localidadeId;
  const cultura = state.culturaSelecionada;

  try {
    const [painel, sugestao] = await Promise.all([
      apiFetch(`/api/v1/localidades/${locId}/painel-chuva?cultura=${encodeURIComponent(cultura)}`),
      apiFetch(`/api/v1/localidades/${locId}/sugestao-plantio?cultura=${encodeURIComponent(cultura)}`)
    ]);

    await OfflineDB.setCache(`${STORAGE_KEYS.CACHE_PAINEL}_${locId}_${cultura}`, {
      painel,
      sugestao,
      savedAt: new Date().toISOString()
    });

    renderPainelAndSugestao(painel, sugestao, false);
  } catch {
    const cached = await OfflineDB.getCache(`${STORAGE_KEYS.CACHE_PAINEL}_${locId}_${cultura}`);
    if (cached) {
      renderPainelAndSugestao(cached.painel, cached.sugestao, true);
    }
  }
}

function renderPainelAndSugestao(painel, sugestao, isOfflineCache) {
  if (!painel) return;

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

  // Atualiza barra de contexto da IA no Chat
  const chatCtx = $("#chat-climate-context");
  const chatPill = $("#chat-situacao-pill");
  const sideLoc = $("#chat-side-loc");
  const sideMes = $("#chat-side-mes");
  const side7d = $("#chat-side-7d");
  const sideSit = $("#chat-side-sit");

  if (chatCtx) {
    chatCtx.innerHTML = `📍 <strong>${escapeHtml(painel.localidadeNome)}</strong> · ${painel.acumuladoMesMm} mm no mês · ${painel.estacaoInmet?.temperaturaC ?? 27} °C`;
  }
  if (chatPill && diag) {
    chatPill.textContent = diag.rotulo;
    chatPill.className = `status-label ${
      diag.codigo === "FAVORAVEL"
        ? "status-good"
        : diag.codigo === "ESTIAGEM"
        ? "status-alert"
        : "status-warn"
    }`;
  }
  if (sideLoc) sideLoc.textContent = painel.localidadeNome;
  if (sideMes) sideMes.textContent = `${painel.acumuladoMesMm} mm`;
  if (side7d) side7d.textContent = `${painel.acumuladoRecenteMm} mm`;
  if (sideSit) sideSit.textContent = diag?.rotulo || "Em análise";

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
   HISTÓRICO DE CHUVAS, RESERVATÓRIOS, ALERTAS E MURAL
   ========================================================================== */
async function loadPrecipitacoes() {
  const container = $("#precipitacoes-list");
  if (!container) return;

  if (!state.token) {
    container.innerHTML = `<p class="muted">Entre na sua conta para anotar e consultar o histórico do seu pluviômetro.</p>`;
    return;
  }

  try {
    const page = await apiFetch("/api/v1/precipitacoes?size=6");
    const items = page?.content || [];
    if (items.length === 0) {
      container.innerHTML = `<p class="muted">Nenhum registro de chuva anotado ainda.</p>`;
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
  const selectRes = $("#select-reservatorio");
  if (state.token) {
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
  } else if (selectRes) {
    selectRes.innerHTML = `<option value="1">Cisterna de Demonstração (Entre para salvar)</option>`;
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
   CHAT ASSISTENTE DE PLANTIO (CONECTADO ÀS APIS DE CLIMA E IA)
   ========================================================================== */
function appendChatMessage(autor, texto) {
  const container = $("#chat-messages");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${autor === "usuario" ? "user" : "bot"}`;

  if (autor === "usuario") {
    bubble.textContent = texto;
  } else {
    const textDiv = document.createElement("div");
    textDiv.textContent = texto;
    bubble.appendChild(textDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "chat-bubble-actions";

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "chat-speak-btn";
    speakBtn.title = "Ouvir esta resposta";
    speakBtn.textContent = "🔊";
    speakBtn.addEventListener("click", () => {
      if (window.MC_Voz && typeof window.MC_Voz.lerTexto === "function") {
        window.MC_Voz.lerTexto(texto);
      }
    });

    actionsDiv.appendChild(speakBtn);
    bubble.appendChild(actionsDiv);
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

async function enviarPerguntaChatIa(perguntaTexto) {
  const pergunta = String(perguntaTexto || "").trim();
  if (!pergunta) return;

  appendChatMessage("usuario", pergunta);
  state.chatHistory.push({ autor: "usuario", texto: pergunta });

  const btnSend = $("#btn-chat-send");
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.textContent = "Consultando...";
  }

  try {
    const res = await apiFetch("/api/v1/ia/chat", {
      method: "POST",
      body: JSON.stringify({
        mensagem: pergunta,
        localidadeId: state.localidadeId,
        cultura: state.culturaSelecionada,
        historico: state.chatHistory.slice(-6)
      })
    });

    const resposta = res?.resposta || "Estou acompanhando os dados da sua localidade. Verifique a umidade do solo antes de semear.";
    appendChatMessage("assistente", resposta);
    state.chatHistory.push({ autor: "assistente", texto: resposta });
  } catch {
    const diag = state.ultimoDiagnostico;
    const msgOffline = diag
      ? `Modo offline: em ${diag.localidadeNome}, o acumulado do mês é de ${diag.acumuladoMesMm} mm (${diag.rotuloSituacao}). Mantenha a cobertura do solo com palhada e ajuste o plantio conforme a umidade da terra.`
      : "Sem conexão no momento. Verifique a umidade da terra a 15 cm de profundidade antes de semear.";
    appendChatMessage("assistente", msgOffline);
  } finally {
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.textContent = "Perguntar";
    }
  }
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
    showFeedback("#auth-feedback", `Bem-vindo(a), ${msg.payload.nome}!`);
    await loadAllLocalityData();
  }
});

async function flushOfflineQueue() {
  if (!state.token || !navigator.onLine) return;
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
    if (navigator.onLine) {
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

  // Chips de demonstração
  $$(".chip-demo").forEach((chip) => {
    chip.addEventListener("click", () => {
      const tel = $("#login-telefone");
      const pass = $("#login-senha");
      if (tel) tel.value = chip.dataset.demoPhone;
      if (pass) pass.value = chip.dataset.demoPass;
      $("#form-login")?.requestSubmit();
    });
  });

  // Botões Entrar / Sair com confirmação
  $("#btn-open-auth")?.addEventListener("click", () => {
    switchView("view-inicio");
    const authPanel = $("#auth-panel");
    if (authPanel) {
      authPanel.hidden = false;
      authPanel.scrollIntoView({ behavior: "smooth" });
    }
  });

  const logoutModal = $("#logout-confirm-modal");
  const logoutCancelBtn = $("#logout-cancel-btn");
  const logoutConfirmBtn = $("#logout-confirm-btn");

  $("#btn-logout")?.addEventListener("click", () => {
    if (logoutModal) logoutModal.hidden = false;
  });

  logoutCancelBtn?.addEventListener("click", () => {
    if (logoutModal) logoutModal.hidden = true;
  });

  logoutConfirmBtn?.addEventListener("click", () => {
    if (logoutModal) logoutModal.hidden = true;
    saveAuthSession(null);
    loadAllLocalityData();
    switchView("view-inicio");
  });

  // Login Submit
  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          telefone: fd.get("telefone"),
          senha: fd.get("senha")
        })
      });
      saveAuthSession(res);
      const selectPainel = $("#select-localidade");
      if (selectPainel) selectPainel.value = String(state.localidadeId);
      showFeedback("#auth-feedback", `Bem-vindo(a), ${res.nome}!`);
      await flushOfflineQueue();
      await loadAllLocalityData();
    } catch (err) {
      showFeedback("#auth-feedback", err.message, true);
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
      localidadeId: Number(fd.get("localidadeId")),
      abastecimento: fd.get("abastecimento"),
      senha: fd.get("senha"),
      consentimentoLocalizacao: fd.get("consentimentoLocalizacao") === "on"
    };
    try {
      await apiFetch("/api/v1/usuarios", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const loginRes = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          telefone: payload.telefone,
          senha: payload.senha
        })
      });
      saveAuthSession(loginRes);
      const selectPainel = $("#select-localidade");
      if (selectPainel) selectPainel.value = String(state.localidadeId);
      showFeedback("#auth-feedback", "Conta criada com sucesso!");
      await loadAllLocalityData();
    } catch (err) {
      showFeedback("#auth-feedback", err.message, true);
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
      showFeedback("#chuva-feedback", "Chuva registrada com sucesso!");
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

  // Chat Assistente de Plantio (IA + Clima)
  $("#form-chat-ia")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#chat-input-text");
    if (!input || !input.value.trim()) return;
    const texto = input.value.trim();
    input.value = "";
    await enviarPerguntaChatIa(texto);
  });

  $$("[data-quick-ask]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-quick-ask");
      if (q) enviarPerguntaChatIa(q);
    });
  });

  $$("[data-speak-text]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-speak-text");
      if (t && window.MC_Voz && typeof window.MC_Voz.lerTexto === "function") {
        window.MC_Voz.lerTexto(t);
      }
    });
  });

  window.addEventListener("online", () => {
    updateSyncBadge();
    flushOfflineQueue();
    loadPainelChuvaAndSugestao();
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
  populateProfileScreen();
  await flushOfflineQueue();
  await loadAllLocalityData();
  iniciarAtualizacaoAutomaticaClima();
}

document.addEventListener("DOMContentLoaded", initApp);
