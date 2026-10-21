/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — APP.JS
   Integração completa com Backend (Render / Local), Cache e Fila Offline (RF17)
   ========================================================================== */

const API_BASE = localStorage.getItem("manejo-api-base") || "/api/v1";
const TOKEN_KEY = "manejo-caatingueiro-token";
const CACHE_KEY = "manejo-caatingueiro-cache-v2";
const QUEUE_KEY = "manejo-caatingueiro-offline-queue";

let currentUser = null;
let localities = [];
let cultures = [];
let reservoirs = [];
let currentPanel = null;

// --- CACHE E FILA DE SINCRONIZAÇÃO OFFLINE (RF17 / RN10 / RN13) ---
function lerCache(chave) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data[chave] || null;
  } catch {
    return null;
  }
}

function salvarCache(chave, valor) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[chave] = valor;
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function lerFilaOffline() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function adicionarFilaOffline(item) {
  const fila = lerFilaOffline();
  fila.push({
    ...item,
    idClienteSync: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    criadoOfflineEm: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(fila));
  atualizarIndicadorSync();
}

function atualizarIndicadorSync() {
  const fila = lerFilaOffline();
  const statusText = document.querySelector("#sync-status-text");
  const statusDot = document.querySelector("#sync-status-dot");
  const syncBtn = document.querySelector("#sync-now-button");

  if (!statusText || !statusDot) return;

  if (fila.length > 0) {
    statusDot.classList.add("offline");
    statusText.textContent = `${fila.length} pendência(s) para sincronizar`;
    if (syncBtn) syncBtn.classList.remove("hidden");
  } else {
    statusDot.classList.remove("offline");
    statusText.textContent = navigator.onLine ? "Sincronizado" : "Modo offline (cache ativo)";
    if (syncBtn) syncBtn.classList.add("hidden");
  }
}

async function sincronizarFilaOffline() {
  const fila = lerFilaOffline();
  if (fila.length === 0) return;

  const precipitacoesBatch = fila.filter(i => i.tipoItem === "PRECIPITACAO");
  const niveisBatch = fila.filter(i => i.tipoItem === "NIVEL");

  try {
    await api("/sync/registros", {
      method: "POST",
      body: JSON.stringify({
        precipitacoes: precipitacoesBatch,
        niveis: niveisBatch
      })
    });
    localStorage.removeItem(QUEUE_KEY);
    atualizarIndicadorSync();
    await loadPanel();
  } catch (err) {
    console.warn("Ainda sem conexão para sincronizar:", err.message);
  }
}

// --- CLIENTE HTTP COM SUPORTE A CACHE DE LEITURA ---
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");

  const metodo = (options.method || "GET").toUpperCase();

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 401) {
      signOut();
      throw new Error("Sua sessão terminou. Entre novamente para continuar.");
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.mensagem || "Não foi possível concluir a solicitação.");
    }
    if (metodo === "GET" && payload !== null) {
      salvarCache(path, payload);
    }
    return payload;
  } catch (error) {
    // RN13: Em caso de falha de rede em leitura GET, retorna último snapshot em cache
    if (metodo === "GET") {
      const emCache = lerCache(path);
      if (emCache !== null) {
        return emCache;
      }
    }
    throw error;
  }
}

function showError(element, message) {
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("hidden", !message);
}

function setLoading(button, loading, label) {
  if (!button) return;
  button.disabled = loading;
  if (loading) {
    button.dataset.label = button.innerHTML;
    button.textContent = label;
  } else if (button.dataset.label) {
    button.innerHTML = button.dataset.label;
    delete button.dataset.label;
  }
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "--";
  const parts = String(value).slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function monthName(month) {
  const date = new Date(2026, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long" });
}

function setAuthView(viewName) {
  const signup = viewName === "signup";
  document.querySelector("#login-panel")?.classList.toggle("hidden", signup);
  document.querySelector("#signup-panel")?.classList.toggle("hidden", !signup);
  document.querySelector("#login-tab")?.classList.toggle("active", !signup);
  document.querySelector("#signup-tab")?.classList.toggle("active", signup);
  document.querySelector("#login-tab")?.setAttribute("aria-selected", String(!signup));
  document.querySelector("#signup-tab")?.setAttribute("aria-selected", String(signup));
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("hidden", view.id !== viewName);
  });
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });
  showError(document.querySelector("#dashboard-error"), "");

  if (viewName === "suggestion-view") {
    consultarSugestaoPlantio();
  } else if (viewName === "reservoir-entry") {
    carregarDadosReservatoriosEMonitor();
  } else if (viewName === "community-view") {
    carregarAlertasEMural();
  } else if (viewName === "rain-entry") {
    carregarHistoricoPrecipitacoes();
  }
}

function addOptions(select, items, valueFor, labelFor) {
  if (!select) return;
  select.replaceChildren();
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = valueFor(item);
    option.textContent = labelFor(item);
    select.append(option);
  });
}

async function loadSignupLocalities() {
  const select = document.querySelector("#signup-locality");
  if (!select) return;
  try {
    const items = await api("/localidades");
    select.replaceChildren(new Option("Selecione sua localidade (Município ou Povoado)", ""));
    items.forEach(item => {
      const label = item.tipo === "POVOADO" && item.paiNome ? `${item.nome} (${item.paiNome})` : `${item.nome} · Município`;
      select.add(new Option(label, item.id));
    });
  } catch (error) {
    select.replaceChildren(new Option("Não foi possível carregar localidades", ""));
  }
}

function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  currentUser = null;
  document.querySelector("#app-screen")?.classList.add("hidden");
  document.querySelector("#login-screen")?.classList.remove("hidden");
}

// --- CARREGAMENTO DO PAINEL PRINCIPAL ---
async function loadDashboard() {
  const dashboardError = document.querySelector("#dashboard-error");
  showError(dashboardError, "");

  const [user, localityData, cultureData, reservoirData] = await Promise.all([
    api("/usuarios/me"),
    api("/localidades"),
    api("/culturas"),
    api("/reservatorios")
  ]);

  currentUser = user;
  localities = localityData;
  cultures = cultureData;
  reservoirs = reservoirData;

  const userNameEl = document.querySelector("#user-name");
  const userLocalityEl = document.querySelector("#user-locality");
  const homeLocalityEl = document.querySelector("#home-locality-name");
  const logoutBtn = document.querySelector("#logout-button");

  if (userNameEl) userNameEl.textContent = `${user.nome} · ${user.perfil === "GESTOR_PUBLICO" ? "Gestor" : "Agricultor"}`;
  if (userLocalityEl) userLocalityEl.textContent = user.localidadeNome;
  if (homeLocalityEl) homeLocalityEl.textContent = user.localidadeNome;
  if (logoutBtn) logoutBtn.textContent = user.nome.trim().charAt(0).toLocaleUpperCase("pt-BR");

  const localitySelect = document.querySelector("#locality-select");
  const cultureSelect = document.querySelector("#culture-select");

  addOptions(localitySelect, localities, item => item.id, item => item.nome);
  if (localitySelect) localitySelect.value = String(user.localidadeId);

  addOptions(cultureSelect, cultures, item => item.nome, item => item.nome.charAt(0).toUpperCase() + item.nome.slice(1));

  // RF07: Oculta registro individual de poço apenas se o usuário só tem água encanada e nenhum reservatório,
  // mas permite acessar o Monitor Comunitário ou cadastrar novo poço/cisterna
  const temPocoOuCisterna = user.abastecimento !== "ENCANADA" || reservoirs.length > 0;
  document.querySelector("#reservoir-action")?.classList.toggle("hidden", !temPocoOuCisterna);

  // Preenche select de reservatórios
  const resSelect = document.querySelector("#reservoir-select");
  const checkResSelect = document.querySelector("#checklist-reservoir-select");
  if (reservoirs.length > 0) {
    addOptions(resSelect, reservoirs, item => item.id, item => `${item.apelido || item.tipo} (${item.ultimoNivelPercentual ?? 0}%)`);
    addOptions(checkResSelect, reservoirs, item => item.id, item => `${item.apelido || item.tipo}`);
  }

  // Exibe formulário de emissão de alerta se for GESTOR ou LIDERANCA
  const formAlerta = document.querySelector("#alerta-form-box");
  if (formAlerta) {
    formAlerta.classList.toggle("hidden", user.perfil === "AGRICULTOR");
  }

  atualizarIndicadorSync();
  await loadPanel();

  document.querySelector("#login-screen")?.classList.add("hidden");
  document.querySelector("#app-screen")?.classList.remove("hidden");
}

async function loadPanel() {
  const dashboardError = document.querySelector("#dashboard-error");
  const localitySelect = document.querySelector("#locality-select");
  const cultureSelect = document.querySelector("#culture-select");
  if (!localitySelect || !localitySelect.value) return;

  showError(dashboardError, "");
  const params = new URLSearchParams();
  if (cultureSelect?.value) params.set("cultura", cultureSelect.value);
  const query = params.size ? `?${params}` : "";

  try {
    const panel = await api(`/localidades/${localitySelect.value}/painel-chuva${query}`);
    currentPanel = panel;
    renderPanel(panel);
  } catch (error) {
    showError(dashboardError, error.message);
  }
}

function renderPanel(panel) {
  const total = panel.acumuladoMesMm;
  const normal = panel.normalMesMm;
  const percent = panel.percentualDaNormal;

  document.querySelector("#rain-total").textContent = total == null ? "—" : formatNumber(total);
  document.querySelector("#rain-normal").textContent = normal == null ? "—" : formatNumber(normal);
  document.querySelector("#rain-percent").textContent = percent == null ? "Sem comparação" : `${formatNumber(percent)}% da normal`;
  document.querySelector("#rain-progress").style.width = `${Math.min(Math.max(percent || 0, 0), 100)}%`;
  document.querySelector("#rain-source").textContent = panel.fonte || "Fonte não informada";
  document.querySelector("#rain-updated").textContent = panel.atualizadoEm ? `Atualizado ${formatDateTime(panel.atualizadoEm)}` : "Atualização indisponível";
  document.querySelector("#rain-month").textContent = panel.mes ? monthName(panel.mes) : "Este mês";

  const estacaoEl = document.querySelector("#rain-season");
  const recenteEl = document.querySelector("#rain-recent");
  const limiarEl = document.querySelector("#rain-culture-threshold");
  if (estacaoEl) estacaoEl.textContent = panel.acumuladoEstacaoMm == null ? "—" : `${formatNumber(panel.acumuladoEstacaoMm)} mm`;
  if (recenteEl) recenteEl.textContent = panel.acumuladoRecenteMm == null ? "—" : `${formatNumber(panel.acumuladoRecenteMm)} mm`;
  if (limiarEl) {
    limiarEl.textContent = panel.comparacaoCultura
      ? `${formatNumber(panel.comparacaoCultura.limiarMm)} mm (${panel.comparacaoCultura.culturaNome})`
      : "—";
  }

  const localitySelect = document.querySelector("#locality-select");
  document.querySelector("#home-locality-name").textContent =
    panel.localidadeNome || localitySelect?.selectedOptions[0]?.textContent || "Sua localidade";

  const abaixoDoEsperado = percent != null && percent < 75;
  document.querySelector("#rain-alert")?.classList.toggle("hidden", !abaixoDoEsperado);

  // Atualiza a ilustração climática dinâmica automaticamente conforme os dados
  if (window.atualizarIlustracaoClimatica) {
    if (percent != null && percent >= 90) {
      window.atualizarIlustracaoClimatica("favoravel");
    } else if (percent != null && percent >= 55) {
      window.atualizarIlustracaoClimatica("atencao");
    } else {
      window.atualizarIlustracaoClimatica("estiagem");
    }
  }

  const historyNote = document.querySelector("#history-note");
  if (historyNote) {
    historyNote.textContent = panel.historicoSuficiente
      ? `Série histórica validada (30 anos) · ${panel.resumoComparativo || ""}`
      : "Ainda não temos histórico suficiente para esta região. Registros locais ajudam a melhorar as próximas indicações.";
    historyNote.classList.remove("hidden");
  }

  const comparison = panel.comparacaoCultura;
  const synthetic = /stub|sint[eé]tic|fict[ií]ci/i.test(panel.fonte || "");
  document.querySelector("#demo-notice")?.classList.toggle("hidden", !synthetic);

  const thresholdInput = document.querySelector("#threshold-value");
  if (thresholdInput && comparison?.limiarMm != null) {
    thresholdInput.value = comparison.limiarMm;
  }
}

// --- SUGESTÃO CONSULTIVA DE PLANTIO (RF05 / RF06 / RN09 / RN12) ---
async function consultarSugestaoPlantio() {
  const localitySelect = document.querySelector("#locality-select");
  const cultureSelect = document.querySelector("#culture-select");
  const dashboardError = document.querySelector("#dashboard-error");

  if (!cultureSelect?.value || !localitySelect?.value) return;

  try {
    const result = await api(`/localidades/${localitySelect.value}/sugestao-plantio?cultura=${encodeURIComponent(cultureSelect.value)}`);
    const insufficient = result.resultado === "DADOS_INSUFICIENTES";
    const status = document.querySelector("#suggestion-status");
    if (status) {
      status.textContent = insufficient
        ? "DADOS INSUFICIENTES"
        : result.resultado === "CONDICAO_FAVORAVEL"
        ? "CONDIÇÃO FAVORÁVEL PARA PLANTIO"
        : result.resultado === "ATENCAO_CONSIDERE_ADIAR"
        ? "ATENÇÃO · CONSIDERE AGUARDAR MAIS CHUVA"
        : "ALERTA DE SECA · CONSIDERE CULTURA ALTERNATIVA";
      status.classList.toggle("status-good", result.resultado === "CONDICAO_FAVORAVEL");
    }

    document.querySelector("#suggestion-culture").textContent = result.cultura || cultureSelect.value;
    document.querySelector("#suggestion-message").textContent = result.mensagem || "";
    document.querySelector("#suggestion-data").textContent = result.dadoUsadoMm == null ? "Sem dado" : formatNumber(result.dadoUsadoMm);
    document.querySelector("#suggestion-reference").textContent =
      result.referenciaMm == null ? "Referência: indisponível" : `Limiar de referência para ${result.cultura}: ${formatNumber(result.referenciaMm)} mm`;
    document.querySelector("#suggestion-source").textContent =
      `${result.fonte || "Fonte não informada"}${result.dataDado ? ` · atualizado ${formatDateTime(result.dataDado)}` : ""}`;

    const confidence = result.grauConfianca == null ? 0 : Math.round(result.grauConfianca * 100);
    document.querySelector("#suggestion-confidence-text").textContent = `${confidence}%`;
    document.querySelector("#suggestion-confidence").style.width = `${Math.min(Math.max(confidence, 0), 100)}%`;

    const thresholdInput = document.querySelector("#threshold-value");
    if (thresholdInput) {
      thresholdInput.value = result.referenciaMm ?? currentPanel?.comparacaoCultura?.limiarMm ?? "";
    }
  } catch (error) {
    showError(dashboardError, error.message);
  }
}

// --- HISTÓRICO DE PRECIPITAÇÕES DO AGRICULTOR (RF03) ---
async function carregarHistoricoPrecipitacoes() {
  const container = document.querySelector("#rain-history-list");
  if (!container) return;
  try {
    const pagina = await api("/precipitacoes");
    const itens = pagina?.content || [];
    if (itens.length === 0) {
      container.innerHTML = `<p class="muted">Nenhum registro manual enviado ainda.</p>`;
      return;
    }
    container.innerHTML = itens
      .slice(0, 6)
      .map(
        item => `
        <div class="history-item">
          <div>
            <strong>${formatNumber(item.volumeMm)} mm</strong>
            <span> · ${formatDate(item.dataEvento)}</span>
          </div>
          <span class="muted">${item.fonte === "PLUVIOMETRO_PROPRIO" ? "Pluviômetro próprio" : item.fonte === "ESTACAO" ? "Estação comunitária" : "Estimativa visual"}</span>
        </div>
      `
      )
      .join("");
  } catch {
    container.innerHTML = `<p class="muted">Histórico disponível em cache.</p>`;
  }
}

// --- RESERVATÓRIOS, CHECKLIST SANITÁRIO E MONITOR COMUNITÁRIO (RF07, RF08, RF16, RN15) ---
async function carregarDadosReservatoriosEMonitor() {
  const localitySelect = document.querySelector("#locality-select");
  if (!localitySelect?.value) return;

  try {
    const [resList, monitor] = await Promise.all([
      api("/reservatorios"),
      api(`/localidades/${localitySelect.value}/monitor-reservatorios`)
    ]);
    reservoirs = resList;

    const resSelect = document.querySelector("#reservoir-select");
    const checkResSelect = document.querySelector("#checklist-reservoir-select");
    if (reservoirs.length > 0) {
      addOptions(resSelect, reservoirs, item => item.id, item => `${item.apelido || item.tipo} (${item.ultimoNivelPercentual ?? 0}%)`);
      addOptions(checkResSelect, reservoirs, item => item.id, item => `${item.apelido || item.tipo}`);
    }

    renderMonitorComunitario(monitor);

    if (reservoirs.length > 0) {
      await carregarUltimoChecklist(reservoirs[0].id);
    }
  } catch (err) {
    console.warn("Erro ao carregar monitor de reservatórios:", err.message);
  }
}

function renderMonitorComunitario(monitor) {
  const container = document.querySelector("#monitor-comunitario-box");
  if (!container || !monitor) return;

  if (!monitor.suficiente) {
    container.innerHTML = `
      <div class="decision-note">
        <strong>Privacidade Comunitária (RN15):</strong> ${monitor.mensagem || "A localidade ainda não atingiu o número mínimo de participantes para exibição agregada sem expor famílias."}
      </div>
    `;
    return;
  }

  const dist = monitor.distribuicaoEscala || { CHEIO: 0, MEDIO: 0, BAIXO: 0, CRITICO: 0 };
  container.innerHTML = `
    <p class="muted">Visão agregada e anônima de <strong>${monitor.totalReservatorios || monitor.totalParticipantes}</strong> reservatórios comunitários em <strong>${monitor.localidadeNome || "sua localidade"}</strong> (Média: <strong>${monitor.resumoNivelPercentual ?? "--"}%</strong> · Risco sanitário sinalizado em <strong>${monitor.comRiscoSanitario || 0}</strong>).</p>
    <div class="monitor-summary-grid">
      <div class="monitor-stat">
        <strong>${dist.CHEIO || 0}</strong>
        <span>Cheios (≥75%)</span>
      </div>
      <div class="monitor-stat">
        <strong>${dist.MEDIO || 0}</strong>
        <span>Médios (40–74%)</span>
      </div>
      <div class="monitor-stat">
        <strong>${dist.BAIXO || 0}</strong>
        <span>Baixos (15–39%)</span>
      </div>
      <div class="monitor-stat">
        <strong>${dist.CRITICO || 0}</strong>
        <span>Críticos (<15%)</span>
      </div>
    </div>
    <small class="muted">Última sincronização agregada: ${formatDateTime(monitor.ultimaSincronizacao || new Date().toISOString())} · Nenhum dado individual de família é exibido (RN15).</small>
  `;
}

async function carregarUltimoChecklist(reservatorioId) {
  const statusEl = document.querySelector("#checklist-last-status");
  if (!statusEl || !reservatorioId) return;
  try {
    const ultimo = await api(`/reservatorios/${reservatorioId}/checklists/ultimo`);
    if (!ultimo || !ultimo.id) {
      statusEl.innerHTML = `<span class="muted">Nenhuma inspeção sanitária registrada para este reservatório.</span>`;
      return;
    }
    statusEl.innerHTML = ultimo.riscoPotabilidade
      ? `<div class="rain-alert"><strong>Atenção Sanitária (RN11):</strong> Última revisão (${formatDate(ultimo.dataAvaliacao)}) identificou ponto não conforme com risco à potabilidade. Verifique calhas, tampa e vedação.</div>`
      : `<div class="form-success">Última revisão (${formatDate(ultimo.dataAvaliacao)}): Reservatório em conformidade sanitária, sem risco aparente de contaminação.</div>`;
  } catch {
    statusEl.innerHTML = "";
  }
}

// --- ALERTAS CLIMÁTICOS E MURAL COMUNITÁRIO (RF12, RF13, RF14, RF15) ---
async function carregarAlertasEMural() {
  const localitySelect = document.querySelector("#locality-select");
  const locId = localitySelect?.value || currentUser?.localidadeId || 1;

  try {
    const [listaAlertas, listaAvisos] = await Promise.all([
      api(`/alertas?localidadeId=${locId}`),
      api(`/avisos?localidadeId=${locId}`)
    ]);

    const alertasContainer = document.querySelector("#alertas-list");
    if (alertasContainer) {
      if (!listaAlertas || listaAlertas.length === 0) {
        alertasContainer.innerHTML = `<p class="muted">Nenhum alerta climático extraordinário vigente para esta localidade.</p>`;
      } else {
        alertasContainer.innerHTML = listaAlertas
          .map(
            a => `
            <article class="feed-card alerta-${(a.severidade || "INFO").toLowerCase()}">
              <p class="eyebrow">${a.severidade || "ATENÇÃO"} · ${a.tipo || "CLIMÁTICO"}</p>
              <h4>${a.titulo || "Alerta da Localidade"}</h4>
              <p>${a.mensagem}</p>
              <div class="feed-meta">Fonte: ${a.fonte || "Defesa Civil / Painel"} · Vigente até ${formatDate(a.vigenteAte)}</div>
            </article>
          `
          )
          .join("");
      }
    }

    const muralContainer = document.querySelector("#mural-list");
    if (muralContainer) {
      const itens = listaAvisos?.content || listaAvisos || [];
      if (itens.length === 0) {
        muralContainer.innerHTML = `<p class="muted">Nenhum aviso publicado nos últimos 30 dias. Seja o primeiro a compartilhar!</p>`;
      } else {
        muralContainer.innerHTML = itens
          .map(
            m => `
            <article class="feed-card">
              <h4>${m.titulo}</h4>
              <p>${m.conteudo}</p>
              <div class="feed-meta">Publicado por <strong>${m.autorNome || "Agricultor da Comunidade"}</strong> · Visível até ${formatDate(m.visivelAte)} (RN08)</div>
            </article>
          `
          )
          .join("");
      }
    }
  } catch (err) {
    console.warn("Erro ao carregar comunidade:", err.message);
  }
}

// --- INICIALIZAÇÃO DE EVENTOS ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#login-form");
  const signupForm = document.querySelector("#signup-form");
  const localitySelect = document.querySelector("#locality-select");
  const cultureSelect = document.querySelector("#culture-select");

  // Data atual no cabeçalho e campos date
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLabel = document.querySelector("#today-label");
  if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    })
      .format(new Date())
      .toLocaleUpperCase("pt-BR");
  }
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    if (!inp.value) inp.value = todayStr;
  });

  // Botões de acesso rápido para demonstração (Zé Ronaldo e Gestor IFBA)
  document.querySelectorAll("[data-demo-phone]").forEach(btn => {
    btn.addEventListener("click", () => {
      const phoneInput = document.querySelector("#telefone");
      const passInput = document.querySelector("#senha");
      if (phoneInput && passInput) {
        phoneInput.value = btn.dataset.demoPhone;
        passInput.value = btn.dataset.demoPass || "senha123";
        loginForm?.requestSubmit();
      }
    });
  });

  // Login
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const loginError = document.querySelector("#login-error");
    showError(loginError, "");
    const button = loginForm.querySelector("button[type=submit]");
    setLoading(button, true, "Entrando…");
    const formData = new FormData(loginForm);
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          telefone: formData.get("telefone"),
          senha: formData.get("senha")
        })
      });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(TOKEN_KEY, result.token);
      await loadDashboard();
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      showError(loginError, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Alternar abas Login / Cadastro
  document.querySelectorAll("[data-auth-view]").forEach(button => {
    button.addEventListener("click", () => setAuthView(button.dataset.authView));
  });

  // Cadastro (RF01)
  signupForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = signupForm.querySelector("button[type=submit]");
    const errorElement = document.querySelector("#signup-error");
    const successElement = document.querySelector("#signup-success");
    const formData = new FormData(signupForm);
    const senha = String(formData.get("senha"));
    const confirmation = String(formData.get("senhaConfirmacao"));
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    if (senha !== confirmation) {
      showError(errorElement, "As senhas não conferem.");
      return;
    }

    setLoading(button, true, "Criando cadastro…");
    try {
      await api("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: formData.get("nome"),
          telefone: String(formData.get("telefone")).replace(/\D/g, ""),
          senha,
          perfil: "AGRICULTOR",
          abastecimento: formData.get("abastecimento"),
          localidadeId: Number(formData.get("localidadeId")),
          consentimentoLocalizacao: formData.get("consentimentoLocalizacao") === "on"
        })
      });
      signupForm.reset();
      successElement?.classList.remove("hidden");
    } catch (error) {
      showError(errorElement, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Navegação principal
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.dataset.view) {
      link.addEventListener("click", e => {
        e.preventDefault();
        setView(link.dataset.view);
      });
    }
  });

  document.querySelectorAll("[data-go-view]").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.goView));
  });

  localitySelect?.addEventListener("change", () => {
    loadPanel();
  });

  cultureSelect?.addEventListener("change", () => {
    loadPanel();
  });

  document.querySelector("#logout-button")?.addEventListener("click", signOut);

  // Botão Consultar Sugestão de Plantio
  document.querySelector("#advice-button")?.addEventListener("click", () => {
    setView("suggestion-view");
  });

  // Botão Ingerir Dados Climáticos Reais (Open-Meteo RF18)
  document.querySelector("#refresh-real-weather-btn")?.addEventListener("click", async e => {
    const btn = e.currentTarget;
    setLoading(btn, true, "Consultando satélite/estação…");
    try {
      await api("/admin/ingestao/todas", { method: "POST" });
      await loadPanel();
    } catch (err) {
      showError(document.querySelector("#dashboard-error"), err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // Salvar limiar personalizado do agricultor (RN09)
  document.querySelector("#threshold-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const errorElement = document.querySelector("#threshold-error");
    const successElement = document.querySelector("#threshold-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    const culture = cultures.find(item => item.nome.toLowerCase() === (cultureSelect?.value || "").toLowerCase());
    if (!culture) {
      showError(errorElement, "Selecione uma cultura válida.");
      return;
    }

    setLoading(button, true, "Salvando…");
    try {
      const limiarMm = Number(new FormData(form).get("limiarMm"));
      await api(`/culturas/${culture.id}/limiar-usuario`, {
        method: "PUT",
        body: JSON.stringify({ limiarMm })
      });
      successElement?.classList.remove("hidden");
      await loadPanel();
      await consultarSugestaoPlantio();
    } catch (error) {
      showError(errorElement, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Registrar chuva observada (RF03 + suporte a fila offline RF17)
  document.querySelector("#rain-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const formData = new FormData(form);
    const errorElement = document.querySelector("#rain-error");
    const successElement = document.querySelector("#rain-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    const payload = {
      localidadeId: Number(localitySelect?.value || currentUser?.localidadeId || 1),
      volumeMm: Number(formData.get("volumeMm")),
      dataEvento: formData.get("dataEvento"),
      fonte: formData.get("fonte")
    };

    setLoading(button, true, "Salvando…");
    try {
      await api("/precipitacoes", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      form.reset();
      document.querySelector("#rain-date").value = todayStr;
      if (successElement) {
        successElement.textContent = "Registro salvo no painel da comunidade. Obrigado por contribuir!";
        successElement.classList.remove("hidden");
      }
      await loadPanel();
      await carregarHistoricoPrecipitacoes();
    } catch (error) {
      // RN13 / RF17: guarda na fila offline se estiver sem conexão
      adicionarFilaOffline({ tipoItem: "PRECIPITACAO", ...payload });
      if (successElement) {
        successElement.textContent = "Sem sinal no momento: registro salvo na fila do aparelho e será sincronizado assim que a conexão voltar (RF17).";
        successElement.classList.remove("hidden");
      }
    } finally {
      setLoading(button, false);
    }
  });

  // Botões de escala qualitativa de reservatório (CHEIO / MEDIO / BAIXO / CRITICO)
  document.querySelectorAll("[data-escala-pct]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-escala-pct]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const levelInput = document.querySelector("#reservoir-level");
      if (levelInput) levelInput.value = btn.dataset.escalaPct;
    });
  });

  // Registrar nível do poço / cisterna (RF07)
  document.querySelector("#reservoir-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const formData = new FormData(form);
    const errorElement = document.querySelector("#reservoir-error");
    const successElement = document.querySelector("#reservoir-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    const reservatorioId = Number(document.querySelector("#reservoir-select")?.value);
    const payload = {
      reservatorioId,
      nivelPercentual: Number(formData.get("nivelPercentual")),
      nivelLencolMetros: formData.get("nivelLencolMetros") ? Number(formData.get("nivelLencolMetros")) : null,
      dataRegistro: formData.get("dataRegistro")
    };

    setLoading(button, true, "Salvando…");
    try {
      await api(`/reservatorios/${reservatorioId}/niveis`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (successElement) {
        successElement.textContent = "Nível do reservatório atualizado (RN02: 1 registro consolidado por dia).";
        successElement.classList.remove("hidden");
      }
      await carregarDadosReservatoriosEMonitor();
    } catch (error) {
      adicionarFilaOffline({ tipoItem: "NIVEL", ...payload });
      if (successElement) {
        successElement.textContent = "Salvo na fila offline do aparelho (RF17).";
        successElement.classList.remove("hidden");
      }
    } finally {
      setLoading(button, false);
    }
  });

  // Registrar Checklist Sanitário do Reservatório (RF16 / RN11)
  document.querySelector("#checklist-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const formData = new FormData(form);
    const errorElement = document.querySelector("#checklist-error");
    const successElement = document.querySelector("#checklist-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    const reservatorioId = Number(document.querySelector("#checklist-reservoir-select")?.value || reservoirs[0]?.id || 1);

    setLoading(button, true, "Avaliando…");
    try {
      await api(`/reservatorios/${reservatorioId}/checklists`, {
        method: "POST",
        body: JSON.stringify({
          dataAvaliacao: todayStr,
          protecaoEntrada: formData.get("protecaoEntrada") === "on",
          aguaSemOdorOuCor: formData.get("aguaSemOdorOuCor") === "on",
          entornoLimpo: formData.get("entornoLimpo") === "on",
          estruturaIntegra: formData.get("estruturaIntegra") === "on",
          observacao: formData.get("observacao") || ""
        })
      });
      successElement?.classList.remove("hidden");
      await carregarUltimoChecklist(reservatorioId);
      await carregarDadosReservatoriosEMonitor();
    } catch (error) {
      showError(errorElement, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Publicar Aviso no Mural Comunitário (RF14)
  document.querySelector("#mural-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const formData = new FormData(form);
    const errorElement = document.querySelector("#mural-error");
    const successElement = document.querySelector("#mural-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    setLoading(button, true, "Publicando…");
    try {
      await api("/avisos", {
        method: "POST",
        body: JSON.stringify({
          localidadeId: Number(localitySelect?.value || currentUser?.localidadeId || 1),
          titulo: formData.get("titulo"),
          conteudo: formData.get("conteudo")
        })
      });
      form.reset();
      successElement?.classList.remove("hidden");
      await carregarAlertasEMural();
    } catch (error) {
      showError(errorElement, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Emitir Alerta Climático (RF12 - Gestor / Liderança)
  document.querySelector("#alerta-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const formData = new FormData(form);
    const errorElement = document.querySelector("#alerta-error");
    const successElement = document.querySelector("#alerta-success");
    showError(errorElement, "");
    successElement?.classList.add("hidden");

    setLoading(button, true, "Emitindo alerta…");
    try {
      await api("/alertas", {
        method: "POST",
        body: JSON.stringify({
          localidadeId: Number(localitySelect?.value || currentUser?.localidadeId || 1),
          titulo: formData.get("titulo"),
          mensagem: formData.get("mensagem"),
          severidade: formData.get("severidade"),
          tipo: formData.get("tipo")
        })
      });
      form.reset();
      successElement?.classList.remove("hidden");
      await carregarAlertasEMural();
    } catch (error) {
      showError(errorElement, error.message);
    } finally {
      setLoading(button, false);
    }
  });

  // Sincronizar fila offline manualmente
  document.querySelector("#sync-now-button")?.addEventListener("click", sincronizarFilaOffline);
  window.addEventListener("online", () => {
    atualizarIndicadorSync();
    sincronizarFilaOffline();
  });
  window.addEventListener("offline", atualizarIndicadorSync);

  loadSignupLocalities();
  atualizarIndicadorSync();

  const savedToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  if (savedToken) {
    loadDashboard().catch(() => signOut());
  }
});
