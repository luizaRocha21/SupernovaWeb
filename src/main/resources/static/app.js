const API = "/api/v1";
const TOKEN_KEY = "manejo-caatingueiro-token";
const loginScreen = document.querySelector("#login-screen");
const appScreen = document.querySelector("#app-screen");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const signupForm = document.querySelector("#signup-form");
const dashboardError = document.querySelector("#dashboard-error");
const localitySelect = document.querySelector("#locality-select");
const cultureSelect = document.querySelector("#culture-select");
let currentUser;
let localities = [];
let cultures = [];
let reservoirs = [];
let currentPanel;

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 401) {
    signOut();
    throw new Error("Sua sessão terminou. Entre novamente para continuar.");
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.mensagem || "Não foi possível concluir a solicitação.");
  return payload;
}

function showError(element, message) {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function setLoading(button, loading, label) {
  button.disabled = loading;
  if (loading) {
    button.dataset.label = button.innerHTML;
    button.textContent = label;
  } else if (button.dataset.label) {
    button.innerHTML = button.dataset.label;
    delete button.dataset.label;
  }
}

function setAuthView(viewName) {
  const signup = viewName === "signup";
  document.querySelector("#login-panel").classList.toggle("hidden", signup);
  document.querySelector("#signup-panel").classList.toggle("hidden", !signup);
  document.querySelector("#login-tab").classList.toggle("active", !signup);
  document.querySelector("#signup-tab").classList.toggle("active", signup);
  document.querySelector("#login-tab").setAttribute("aria-selected", String(!signup));
  document.querySelector("#signup-tab").setAttribute("aria-selected", String(signup));
}

async function loadSignupLocalities() {
  const select = document.querySelector("#signup-locality");
  try {
    const items = await api("/localidades");
    select.replaceChildren(new Option("Selecione sua localidade", ""));
    items.forEach(item => select.add(new Option(item.nome, item.id)));
    if (items.length === 0) select.replaceChildren(new Option("Nenhuma localidade cadastrada", ""));
  } catch (error) {
    select.replaceChildren(new Option("Não foi possível carregar localidades", ""));
    showError(document.querySelector("#signup-error"), error.message);
  }
}

function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
  currentUser = null;
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("hidden", view.id !== viewName));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === viewName || (viewName === "suggestion-view" && link.dataset.view === "overview")));
  showError(dashboardError, "");
}

function addOptions(select, items, valueFor, labelFor) {
  select.replaceChildren();
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = valueFor(item);
    option.textContent = labelFor(item);
    select.append(option);
  });
}

async function loadDashboard() {
  showError(dashboardError, "");
  const [user, localityData, cultureData, reservoirData] = await Promise.all([
    api("/usuarios/me"), api("/localidades"), api("/culturas"), api("/reservatorios")
  ]);
  currentUser = user;
  localities = localityData;
  cultures = cultureData;
  reservoirs = reservoirData;
  document.querySelector("#user-name").textContent = user.nome;
  document.querySelector("#user-locality").textContent = user.localidadeNome;
  document.querySelector("#home-locality-name").textContent = user.localidadeNome;
  document.querySelector("#logout-button").textContent = user.nome.trim().charAt(0).toLocaleUpperCase("pt-BR");

  addOptions(localitySelect, localities, item => item.id, item => item.nome);
  localitySelect.value = String(user.localidadeId);
  addOptions(cultureSelect, cultures, item => item.nome, item => item.nome);
  document.querySelector("#reservoir-action").classList.toggle("hidden", reservoirs.length === 0);
  document.querySelector(".reservoir-nav").classList.toggle("hidden", reservoirs.length === 0);
  addOptions(document.querySelector("#reservoir-select"), reservoirs, item => item.id, item => item.apelido || `${item.tipo} · ${item.localidadeNome}`);
  updateCultureSummary();
  await loadPanel();
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

async function loadPanel() {
  showError(dashboardError, "");
  const params = new URLSearchParams();
  if (cultureSelect.value) params.set("cultura", cultureSelect.value);
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
  document.querySelector("#home-locality-name").textContent = panel.localidadeNome || localitySelect.selectedOptions[0]?.textContent || "Sua localidade";
  document.querySelector("#rain-alert").classList.toggle("hidden", percent == null || percent >= 100);
  const historyNote = document.querySelector("#history-note");
  historyNote.textContent = panel.historicoSuficiente
    ? "Histórico de chuva disponível para esta localidade."
    : "Ainda não temos histórico suficiente para esta região. Registros locais ajudam a melhorar as próximas indicações.";
  historyNote.classList.toggle("hidden", panel.historicoSuficiente);
  const comparison = panel.comparacaoCultura;
  const synthetic = /stub|sint[eé]tic|fict[ií]ci/i.test(panel.fonte || "");
  document.querySelector("#demo-notice").classList.toggle("hidden", !synthetic);
  document.querySelector("#threshold-value").value = comparison?.limiarMm ?? "";
}

function updateCultureSummary() {
  document.querySelector("#threshold-form").classList.add("hidden");
  document.querySelector("#threshold-success").classList.add("hidden");
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function monthName(month) {
  const date = new Date(2024, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long" });
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showError(loginError, "");
  const button = loginForm.querySelector("button[type=submit]");
  setLoading(button, true, "Entrando…");
  const formData = new FormData(loginForm);
  try {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ telefone: formData.get("telefone"), senha: formData.get("senha") })
    });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    await loadDashboard();
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    showError(loginError, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelectorAll("[data-auth-view]").forEach(button => {
  button.addEventListener("click", () => setAuthView(button.dataset.authView));
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = signupForm.querySelector("button[type=submit]");
  const errorElement = document.querySelector("#signup-error");
  const successElement = document.querySelector("#signup-success");
  const formData = new FormData(signupForm);
  const senha = String(formData.get("senha"));
  const confirmation = String(formData.get("senhaConfirmacao"));
  showError(errorElement, "");
  successElement.classList.add("hidden");
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
    successElement.classList.remove("hidden");
  } catch (error) {
    showError(errorElement, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => setView(link.dataset.view)));
document.querySelectorAll("[data-go-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.goView)));
localitySelect.addEventListener("change", loadPanel);
cultureSelect.addEventListener("change", () => {
  updateCultureSummary();
  loadPanel();
});
document.querySelector("#logout-button").addEventListener("click", signOut);

document.querySelector("#advice-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  if (!cultureSelect.value) {
    showError(dashboardError, "Nenhuma cultura está cadastrada para consulta.");
    return;
  }
  setLoading(button, true, "Consultando…");
  showError(dashboardError, "");
  try {
    const result = await api(`/localidades/${localitySelect.value}/sugestao-plantio?cultura=${encodeURIComponent(cultureSelect.value)}`);
    const insufficient = result.resultado === "DADOS_INSUFICIENTES";
    const status = document.querySelector("#suggestion-status");
    status.textContent = insufficient ? "DADOS INSUFICIENTES" : result.resultado === "CONDICAO_FAVORAVEL" ? "CONDIÇÃO FAVORÁVEL" : "ATENÇÃO";
    status.classList.toggle("status-good", result.resultado === "CONDICAO_FAVORAVEL");
    document.querySelector("#suggestion-culture").textContent = result.cultura || cultureSelect.value;
    document.querySelector("#suggestion-message").textContent = result.mensagem || "Não há mensagem disponível para esta sugestão.";
    document.querySelector("#suggestion-data").textContent = result.dadoUsadoMm == null ? "Sem dado" : formatNumber(result.dadoUsadoMm);
    document.querySelector("#suggestion-reference").textContent = result.referenciaMm == null ? "Referência: indisponível" : `Referência: ${formatNumber(result.referenciaMm)} mm`;
    document.querySelector("#suggestion-source").textContent = `${result.fonte || "Fonte não informada"}${result.dataDado ? ` · atualizado ${formatDateTime(result.dataDado)}` : ""}`;
    const confidence = result.grauConfianca == null ? 0 : Math.round(result.grauConfianca * 100);
    document.querySelector("#suggestion-confidence-text").textContent = `${confidence}%`;
    document.querySelector("#suggestion-confidence").style.width = `${Math.min(Math.max(confidence, 0), 100)}%`;
    document.querySelector("#suggestion-history-note").textContent = insufficient
      ? `Estado “dados insuficientes”: ${result.mensagem} Registre a chuva observada para contribuir com os dados da região.`
      : "A indicação considera as observações e referências disponíveis para esta localidade. A decisão continua sendo sua.";
    document.querySelector("#threshold-value").value = result.referenciaMm ?? currentPanel?.comparacaoCultura?.limiarMm ?? "";
    setView("suggestion-view");
  } catch (error) {
    showError(dashboardError, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#threshold-toggle").addEventListener("click", () => {
  const form = document.querySelector("#threshold-form");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) document.querySelector("#threshold-value").focus();
});

document.querySelector("#threshold-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const errorElement = document.querySelector("#threshold-error");
  showError(errorElement, "");
  document.querySelector("#threshold-success").classList.add("hidden");
  const culture = cultures.find(item => item.nome === cultureSelect.value);
  if (!culture) return showError(errorElement, "Não foi possível identificar a cultura selecionada.");
  setLoading(button, true, "Salvando…");
  try {
    const limiarMm = Number(new FormData(form).get("limiarMm"));
    await api(`/culturas/${culture.id}/limiar-usuario`, { method: "PUT", body: JSON.stringify({ limiarMm }) });
    document.querySelector("#threshold-success").classList.remove("hidden");
    await loadPanel();
  } catch (error) {
    showError(errorElement, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#rain-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const formData = new FormData(form);
  const errorElement = document.querySelector("#rain-error");
  showError(errorElement, "");
  document.querySelector("#rain-success").classList.add("hidden");
  setLoading(button, true, "Salvando…");
  try {
    await api("/precipitacoes", {
      method: "POST",
      body: JSON.stringify({
        localidadeId: Number(localitySelect.value),
        volumeMm: Number(formData.get("volumeMm")),
        dataEvento: formData.get("dataEvento"),
        fonte: formData.get("fonte")
      })
    });
    form.reset();
    document.querySelector("#rain-date").value = new Date().toISOString().slice(0, 10);
    document.querySelector("#rain-success").classList.remove("hidden");
    await loadPanel();
  } catch (error) {
    showError(errorElement, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#reservoir-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const formData = new FormData(form);
  const errorElement = document.querySelector("#reservoir-error");
  showError(errorElement, "");
  document.querySelector("#reservoir-success").classList.add("hidden");
  setLoading(button, true, "Salvando…");
  try {
    await api(`/reservatorios/${document.querySelector("#reservoir-select").value}/niveis`, {
      method: "POST",
      body: JSON.stringify({ nivelPercentual: Number(formData.get("nivelPercentual")), dataRegistro: formData.get("dataRegistro") })
    });
    document.querySelector("#reservoir-success").classList.remove("hidden");
  } catch (error) {
    showError(errorElement, error.message);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toLocaleUpperCase("pt-BR");
document.querySelector("#rain-date").value = new Date().toISOString().slice(0, 10);
document.querySelector("#reservoir-date").value = new Date().toISOString().slice(0, 10);
loadSignupLocalities();

if (sessionStorage.getItem(TOKEN_KEY)) {
  loadDashboard().then(() => {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
  }).catch(() => signOut());
}