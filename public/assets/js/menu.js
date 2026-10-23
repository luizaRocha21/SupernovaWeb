/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — MENU.JS
   Gerenciador Central da Aba Lateral Unificada (.app-sidebar-nav),
   Seletor de Roça Ativa (#sidebar-select-roca), Menu Retrátil de Configurações
   (#btn-toggle-sidebar-settings), Topbar de Visitante e Modal de Logout
   ========================================================================== */

(function () {
  const AUTH_STORAGE_KEY = "mc_auth_session_v4";
  const THEME_STORAGE_KEY = "mc_acessibilidade_tema_v2";
  const ROCA_ATIVA_STORAGE_KEY = "mc_roca_ativa_v1";
  const ROCAS_CACHE_STORAGE_KEY = "mc_rocas_lista_v1";
  const SETTINGS_OPEN_STORAGE_KEY = "mc_sidebar_settings_open_v1";
  const ADMIN_ROLES = ["GESTOR_PUBLICO", "PREFEITURA", "SINDICATO", "ADMIN"];
  const RENDER_BACKEND_URL = "https://manejo-caatingueiro-api.onrender.com";

  // Garante que chamadas relativas /api/v1/* funcionem tanto no Render/Local quanto no Vercel/GitHub Pages
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    if (!window.MC_API_BASE && (host.includes("vercel.app") || host.includes("github.io"))) {
      window.MC_API_BASE = RENDER_BACKEND_URL;
    }
    if (!window.__mcFetchPatched && typeof window.fetch === "function") {
      window.__mcFetchPatched = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const isRelativeApi = urlStr.startsWith("/api/");
        if (isRelativeApi && window.MC_API_BASE) {
          try {
            const resp = await originalFetch(`${window.MC_API_BASE}${urlStr}`, init);
            if (resp.status !== 404 && resp.status !== 502 && resp.status !== 503) {
              return resp;
            }
          } catch {}
        }
        try {
          const respLocal = await originalFetch(input, init);
          if (isRelativeApi && (respLocal.status === 404 || respLocal.status === 405) && !window.MC_API_BASE) {
            return await originalFetch(`${RENDER_BACKEND_URL}${urlStr}`, init);
          }
          return respLocal;
        } catch (err) {
          if (isRelativeApi) {
            return await originalFetch(`${RENDER_BACKEND_URL}${urlStr}`, init);
          }
          throw err;
        }
      };
    }
  }

  const DEFAULT_ROCAS_FALLBACK = [
    {
      id: 1,
      nome: "Roça Fazenda Baixio",
      localidadeId: 1,
      municipioNome: "Irecê",
      uf: "BA",
      latitude: -11.3042,
      longitude: -41.8558,
      culturaPrincipal: "Milho, Feijão e Mandioca",
      areaHa: 4.5,
      principal: true
    },
    {
      id: 2,
      nome: "Roça Sítio Caraíbas",
      localidadeId: 3,
      municipioNome: "Presidente Dutra",
      uf: "BA",
      latitude: -11.2958,
      longitude: -41.9869,
      culturaPrincipal: "Feijão Caupi e Palma",
      areaHa: 2.8,
      principal: false
    }
  ];

  let cachedRocas = null;
  let fetchingRocasPromise = null;

  function escapeAttr(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getAuthSession() {
    try {
      const keys = [AUTH_STORAGE_KEY, "mc_auth_session_v3", "mc_auth_session_v2"];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") continue;

        const userObj = parsed.usuario || parsed.user || (parsed.id && parsed.nome ? parsed : null);
        if (!userObj && !parsed.token) continue;

        const normalizedUser = userObj
          ? {
              ...userObj,
              id: Number(userObj.id || userObj.usuarioId) || 1,
              nome: userObj.nome || userObj.name || "Agricultor(a)",
              perfil:
                userObj.perfil || userObj.tipoPerfil || userObj.role || "AGRICULTOR"
            }
          : null;

        const normalizedSession = {
          ...parsed,
          token: parsed.token || `local_token_${normalizedUser?.id || 1}`,
          usuario: normalizedUser,
          user: normalizedUser
        };

        try {
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(normalizedSession)
          );
        } catch {}

        return normalizedSession;
      }
      return null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    const session = getAuthSession();
    return Boolean(session && (session.usuario || session.user));
  }

  function isAdminProfile(usuario) {
    if (!usuario) return false;
    const rawRole = String(
      usuario.perfil || usuario.tipoPerfil || usuario.role || ""
    )
      .trim()
      .toUpperCase();
    return ADMIN_ROLES.includes(rawRole);
  }

  function getFirstName(fullName) {
    const clean = String(fullName || "Agricultor(a)").trim();
    if (!clean) return "Agricultor(a)";
    return clean.split(/\s+/)[0];
  }

  function isEntryPage() {
    const pathname = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    return (
      pathname === "/" ||
      pathname.endsWith("/index.html") ||
      pathname.endsWith("/index") ||
      pathname.endsWith("/login.html") ||
      pathname.endsWith("/login")
    );
  }

  function isIndexPage() {
    const pathname = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    return (
      pathname === "/" ||
      pathname.endsWith("/index.html") ||
      pathname.endsWith("/index")
    );
  }

  function isLoginPage() {
    const pathname = (window.location.pathname || "").replace(/\/+$/, "");
    return pathname.endsWith("/login.html") || pathname.endsWith("/login");
  }

  function isLoggedPanelPage() {
    const pathname = (window.location.pathname || "").replace(/\/+$/, "");
    const panelSlugs = [
      "painel",
      "perfil",
      "plantio",
      "reservatorios",
      "comunidade",
      "assistente-ia",
      "admin"
    ];
    return panelSlugs.some(
      (slug) => pathname.endsWith(`/${slug}.html`) || pathname.endsWith(`/${slug}`)
    );
  }

  function isPathActive(href) {
    const pathname = (window.location.pathname || "/index.html").replace(/\/+$/, "") || "/index.html";
    if (href.startsWith("/index.html")) {
      return pathname === "/" || pathname.endsWith("/index.html") || pathname.endsWith("/index");
    }
    const cleanHref = href.split("?")[0].split("#")[0];
    const targetFile = cleanHref.split("/").pop() || "";
    const targetSlug = targetFile.replace(/\.html$/i, "");
    return Boolean(
      targetSlug &&
        (pathname.endsWith(`/${targetFile}`) || pathname.endsWith(`/${targetSlug}`))
    );
  }

  function removeSkipLinksFromDom() {
    try {
      document
        .querySelectorAll(
          '.skip-link, a[href="#main-content"], a[href="#conteudo-principal"], a[href="#conteudo"], a[href="#main"]'
        )
        .forEach((el) => el.remove());

      document.querySelectorAll("body > a, header a").forEach((link) => {
        const text = String(link.textContent || "")
          .trim()
          .toLowerCase();
        if (
          text.includes("conteúdo principal") ||
          text.includes("conteudo principal") ||
          text.includes("pular para")
        ) {
          link.remove();
        }
      });
    } catch {}
  }

  /* ==========================================================================
     GERENCIAMENTO DE MÚLTIPLAS ROÇAS DO AGRICULTOR
     ========================================================================== */
  function normalizeRocaItem(r, idx) {
    if (!r || typeof r !== "object") return null;
    const id = Number(r.id) || idx + 1;
    const localidadeId = Number(r.localidadeId || r.localidade_id) || 1;
    const municipioNome = String(
      r.municipioNome || r.municipio_nome || r.municipio || "Irecê"
    ).trim();
    const uf = String(r.uf || "BA").trim().toUpperCase();
    const nome = String(r.nome || `Roça ${idx + 1}`).trim();
    return {
      id,
      usuarioId: Number(r.usuarioId || r.usuario_id) || 0,
      nome,
      localidadeId,
      municipioNome,
      uf,
      latitude: Number(r.latitude) || -11.3042,
      longitude: Number(r.longitude) || -41.8558,
      culturaPrincipal: String(
        r.culturaPrincipal || r.cultura_principal || "Milho, Feijão e Mandioca"
      ).trim(),
      areaHa: Number(r.areaHa || r.area_ha) || 2.5,
      principal: Boolean(r.principal ?? idx === 0)
    };
  }

  function getRocasUsuario() {
    if (Array.isArray(cachedRocas) && cachedRocas.length > 0) {
      return cachedRocas;
    }

    const session = getAuthSession();
    const sessionRocas = session?.usuario?.rocas || session?.user?.rocas;
    if (Array.isArray(sessionRocas) && sessionRocas.length > 0) {
      cachedRocas = sessionRocas
        .map((r, idx) => normalizeRocaItem(r, idx))
        .filter(Boolean);
      try {
        localStorage.setItem(
          ROCAS_CACHE_STORAGE_KEY,
          JSON.stringify(cachedRocas)
        );
      } catch {}
      return cachedRocas;
    }

    try {
      const rawCache = localStorage.getItem(ROCAS_CACHE_STORAGE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedRocas = parsed
            .map((r, idx) => normalizeRocaItem(r, idx))
            .filter(Boolean);
          return cachedRocas;
        }
      }
    } catch {}

    if (session?.usuario) {
      const u = session.usuario;
      const defaultFromUser = [
        normalizeRocaItem(
          {
            id: 1,
            usuarioId: u.id || 1,
            nome: u.nomePropriedade || `Roça ${getFirstName(u.nome)}`,
            localidadeId: u.localidadePadraoId || u.localidadeId || 1,
            municipioNome: u.municipioNome || "Irecê",
            uf: u.uf || "BA",
            latitude: u.latitude || -11.3042,
            longitude: u.longitude || -41.8558,
            culturaPrincipal: u.culturaPrincipal || "Milho, Feijão e Mandioca",
            areaHa: u.areaHa || 4.0,
            principal: true
          },
          0
        ),
        normalizeRocaItem(DEFAULT_ROCAS_FALLBACK[1], 1)
      ].filter(Boolean);
      cachedRocas = defaultFromUser;
      return cachedRocas;
    }

    return DEFAULT_ROCAS_FALLBACK;
  }

  function getRocaAtiva() {
    const rocas = getRocasUsuario();
    try {
      const rawAtiva = localStorage.getItem(ROCA_ATIVA_STORAGE_KEY);
      if (rawAtiva) {
        const parsed = JSON.parse(rawAtiva);
        if (parsed && parsed.id) {
          const found = rocas.find((r) => Number(r.id) === Number(parsed.id));
          if (found) return found;
          return normalizeRocaItem(parsed, 0) || rocas[0];
        }
      }
    } catch {}

    const principal = rocas.find((r) => r.principal) || rocas[0];
    if (principal) {
      try {
        localStorage.setItem(ROCA_ATIVA_STORAGE_KEY, JSON.stringify(principal));
      } catch {}
    }
    return principal || DEFAULT_ROCAS_FALLBACK[0];
  }

  function formatRocaOptionText(r) {
    if (!r) return "Roça Fazenda Baixio — Irecê, BA";
    const uf = r.uf || "BA";
    return `${r.nome} — ${r.municipioNome}, ${uf}`;
  }

  function formatTopbarRocaLabel(roca) {
    if (!roca) return "🌱 Roça Fazenda Baixio · Irecê";
    return `🌱 ${roca.nome} · ${roca.municipioNome || "Irecê"}`;
  }

  function getAllRocaSelectElements() {
    const set = new Set(
      document.querySelectorAll(
        "#sidebar-select-roca, #select-roca, #painel-select-roca, #plantio-select-roca, [data-roca-select]"
      )
    );
    document.querySelectorAll("select").forEach((sel) => {
      if (sel.id === "select-localidade" || sel.id === "sidebar-tts-speed") {
        return;
      }
      const firstOptText =
        sel.options && sel.options[0]
          ? String(sel.options[0].textContent || "").toLowerCase()
          : "";
      if (
        firstOptText.includes("carregando ro") ||
        firstOptText.includes("carregando...")
      ) {
        set.add(sel);
      }
    });
    return Array.from(set);
  }

  function syncPageLocalitySelectWithRoca(roca) {
    if (!roca) return;
    const locSelect = document.getElementById("select-localidade");
    if (locSelect && roca.localidadeId) {
      const targetVal = String(roca.localidadeId);
      const hasOption = Array.from(locSelect.options || []).some(
        (opt) => String(opt.value) === targetVal
      );
      if (hasOption && String(locSelect.value) !== targetVal) {
        locSelect.value = targetVal;
        locSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    document.querySelectorAll("[data-active-roca-name]").forEach((el) => {
      el.textContent = `${roca.nome} — ${roca.municipioNome}/${roca.uf || "BA"}`;
    });

    document.querySelectorAll("[data-topbar-roca-indicator]").forEach((el) => {
      el.textContent = formatTopbarRocaLabel(roca);
    });
  }

  function setRocaAtiva(rocaId) {
    const rocas = getRocasUsuario();
    const target =
      rocas.find((r) => Number(r.id) === Number(rocaId)) || rocas[0];
    if (!target) return null;

    try {
      localStorage.setItem(ROCA_ATIVA_STORAGE_KEY, JSON.stringify(target));
    } catch {}

    populateSidebarRocaSelector();
    syncPageLocalitySelectWithRoca(target);

    window.dispatchEvent(
      new CustomEvent("mc:roca-changed", { detail: target })
    );

    return target;
  }

  async function syncRocasFromBackend() {
    const session = getAuthSession();
    if (!session || !session.token) return getRocasUsuario();
    if (fetchingRocasPromise) return fetchingRocasPromise;

    const apiBase = window.MC_API_BASE || "";
    fetchingRocasPromise = (async () => {
      try {
        const resp = await fetch(`${apiBase}/api/v1/usuario/rocas`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.token}`
          }
        });
        if (!resp.ok) return getRocasUsuario();
        const data = await resp.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.rocas)
          ? data.rocas
          : [];
        if (list.length > 0) {
          cachedRocas = list
            .map((r, idx) => normalizeRocaItem(r, idx))
            .filter(Boolean);
          try {
            localStorage.setItem(
              ROCAS_CACHE_STORAGE_KEY,
              JSON.stringify(cachedRocas)
            );
            if (session.usuario) {
              session.usuario.rocas = cachedRocas;
              session.user = session.usuario;
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            }
          } catch {}
          populateSidebarRocaSelector();
        }
      } catch {
        // Silencioso em modo offline
      } finally {
        fetchingRocasPromise = null;
      }
      return getRocasUsuario();
    })();

    return fetchingRocasPromise;
  }

  function populateSidebarRocaSelector() {
    const rocas = getRocasUsuario();
    const ativa = getRocaAtiva();

    const optionsHtml = rocas
      .map((r) => {
        const selected =
          ativa && Number(r.id) === Number(ativa.id) ? "selected" : "";
        const label = escapeAttr(formatRocaOptionText(r));
        return `<option value="${escapeAttr(r.id)}" ${selected}>${label}</option>`;
      })
      .join("");

    getAllRocaSelectElements().forEach((sel) => {
      sel.innerHTML = optionsHtml;
      if (ativa) {
        sel.value = String(ativa.id);
      }
      if (!sel.dataset.boundRocaSelectorChange && sel.id !== "sidebar-select-roca") {
        sel.dataset.boundRocaSelectorChange = "true";
        sel.addEventListener("change", (e) => {
          setRocaAtiva(Number(e.target.value));
        });
      }
    });

    if (ativa) {
      syncPageLocalitySelectWithRoca(ativa);
    }
  }

  /* ==========================================================================
     MODAL DE CONFIRMAÇÃO DE LOGOUT (NORMALIZADO CONTRA .modal.fade INVISÍVEL)
     ========================================================================== */
  function ensureLogoutModalExists() {
    let modal = document.getElementById("logout-confirm-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "logout-confirm-modal";
      document.body.appendChild(modal);
    }

    if (!modal.dataset.normalizedOverlay) {
      modal.dataset.normalizedOverlay = "true";
      modal.className = "modal-overlay";
      modal.hidden = true;
      modal.style.display = "none";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "logout-modal-title");
      modal.innerHTML = `
        <div class="modal-box card shadow" style="background-color: #fffaf0; border: 1px solid #d2c2a9; border-radius: 14px; padding: 1.5rem; max-width: 420px; width: 100%;">
          <p class="eyebrow eyebrow-ochre mb-1" style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; color: #8c3719; text-transform: uppercase;">CONFIRMAÇÃO DE SAÍDA</p>
          <h3 id="logout-modal-title" class="h5 mb-2" style="font-family: 'Newsreader', Georgia, serif; color: #542817; font-weight: 600;">Deseja sair da sua conta?</h3>
          <p class="muted small mb-3" style="color: #6e6252;">
            Você poderá entrar novamente a qualquer momento para consultar o painel da sua roça.
          </p>
          <div class="modal-actions d-flex justify-content-end gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary button button-secondary" id="logout-cancel-btn" style="border-radius: 8px; min-height: 42px; font-weight: 600;">
              Continuar na conta
            </button>
            <button type="button" class="btn btn-primary button button-primary" id="logout-confirm-btn" style="background-color: #8c3719; border-color: #8c3719; color: #fffaf0; border-radius: 8px; min-height: 42px; font-weight: 700;">
              Sim, sair agora
            </button>
          </div>
        </div>
      `;
    }
    return modal;
  }

  function closeAllSidebarsImmediately() {
    document
      .querySelectorAll(".app-sidebar-nav, #app-sidebar, .app-sidebar")
      .forEach((sb) => sb.classList.remove("open", "is-open"));
    document
      .querySelectorAll(".app-sidebar-backdrop, #sidebar-backdrop, .sidebar-backdrop")
      .forEach((bd) => bd.classList.remove("open", "is-open", "is-visible"));
    document
      .querySelectorAll("[data-open-sidebar]")
      .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  }

  function openLogoutModal() {
    closeAllSidebarsImmediately();
    const modal = ensureLogoutModalExists();
    modal.classList.remove("fade", "modal");
    modal.classList.add("modal-overlay");
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.style.display = "grid";
    modal.style.opacity = "1";
    modal.style.zIndex = "2000";
  }

  function closeLogoutModal() {
    const modal = document.getElementById("logout-confirm-modal");
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.style.display = "none";
    }
  }

  function executeLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ROCA_ATIVA_STORAGE_KEY);
    localStorage.removeItem(ROCAS_CACHE_STORAGE_KEY);
    cachedRocas = null;
    closeLogoutModal();
    window.dispatchEvent(
      new CustomEvent("mc:auth-changed", { detail: { loggedIn: false } })
    );
    window.location.href = "/index.html?ver=inicio";
  }

  let globalLogoutDelegationBound = false;

  function bindLogoutButtons() {
    const modal = ensureLogoutModalExists();
    const cancelBtn = modal.querySelector("#logout-cancel-btn");
    const confirmBtn =
      modal.querySelector("#logout-confirm-btn") ||
      modal.querySelector("#confirm-logout-btn");

    if (cancelBtn && !cancelBtn.dataset.boundLogout) {
      cancelBtn.dataset.boundLogout = "true";
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeLogoutModal();
      });
    }

    if (confirmBtn && !confirmBtn.dataset.boundLogout) {
      confirmBtn.dataset.boundLogout = "true";
      confirmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        executeLogout();
      });
    }

    document
      .querySelectorAll('#btn-logout, #nav-btn-logout, [data-action="logout"], .btn-sidebar-logout')
      .forEach((btn) => {
        if (btn.dataset.boundLogoutTrigger) return;
        btn.dataset.boundLogoutTrigger = "true";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeAllSidebarsImmediately();
          openLogoutModal();
        });
      });

    if (!globalLogoutDelegationBound) {
      globalLogoutDelegationBound = true;
      document.addEventListener("click", (e) => {
        const trigger =
          e.target && typeof e.target.closest === "function"
            ? e.target.closest('#btn-logout, #nav-btn-logout, [data-action="logout"], .btn-sidebar-logout')
            : null;
        if (trigger) {
          e.preventDefault();
          closeAllSidebarsImmediately();
          openLogoutModal();
          return;
        }
        const confirmTrigger =
          e.target && typeof e.target.closest === "function"
            ? e.target.closest("#logout-confirm-btn, #confirm-logout-btn")
            : null;
        if (confirmTrigger) {
          e.preventDefault();
          executeLogout();
          return;
        }
        const cancelTrigger =
          e.target && typeof e.target.closest === "function"
            ? e.target.closest("#logout-cancel-btn")
            : null;
        if (cancelTrigger) {
          e.preventDefault();
          closeLogoutModal();
        }
      });
    }
  }

  function bindUserBadgeClick() {
    document.querySelectorAll("#user-badge").forEach((badge) => {
      if (badge.dataset.boundProfileClick) return;
      badge.dataset.boundProfileClick = "true";
      badge.style.cursor = "pointer";
      badge.addEventListener("click", (e) => {
        e.preventDefault();
        if (!window.location.pathname.endsWith("/perfil.html")) {
          window.location.href = "/pages/perfil.html";
        }
      });
    });
  }

  /* ==========================================================================
     BARRA SUPERIOR SUTIL (.app-topbar) E GAVETA LATERAL RETRÁTIL (.app-sidebar-nav)
     ========================================================================== */
  function buildLoggedTopbarHtml(rocaAtiva, loggedIn) {
    const onIndex = isIndexPage();
    const showLoggedControls = Boolean(loggedIn && !onIndex);
    const brandHref = loggedIn ? "/pages/painel.html" : "/index.html";

    return `
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          class="btn-menu-drawer"
          id="btn-open-drawer"
          data-open-sidebar
          aria-label="Abrir menu de opções"
          aria-controls="menu"
          aria-expanded="false"
          style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817; font-family: 'DM Sans', sans-serif; font-weight: 600;"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Menu</span>
        </button>

        <a href="${brandHref}" class="topbar-brand d-inline-flex align-items-center gap-2 text-decoration-none">
          <img src="/assets/images/logo.png" alt="Manejo Caatingueiro" width="34" height="34" style="border-radius: 8px;">
          <span style="font-family: 'Newsreader', Georgia, serif; font-weight: 500; color: #542817; font-size: 1.15rem;">Manejo Caatingueiro</span>
        </a>
      </div>

      <div class="d-flex align-items-center gap-2">
        ${
          showLoggedControls
            ? `<a
                href="/pages/perfil.html"
                class="d-none d-md-inline-flex align-items-center gap-1 px-2 py-1 rounded-2 small fw-semibold text-decoration-none"
                data-topbar-roca-indicator
                title="Roça analisada no momento (clique para gerenciar suas roças)"
                style="background-color: #e9efe2; color: #3e4a26; border: 1px solid #b8c7a6; font-family: 'DM Sans', sans-serif;"
              >
                ${escapeAttr(formatTopbarRocaLabel(rocaAtiva))}
              </a>`
            : ""
        }

        <button
          type="button"
          class="theme-icon-btn btn-sound-icon"
          id="btn-tts-icon"
          title="Ouvir resumo desta página"
          aria-label="Ouvir resumo desta página"
          style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817;"
        >
          <span aria-hidden="true">🔊</span>
        </button>

        ${
          showLoggedControls
            ? `<button
                type="button"
                class="btn btn-sm"
                id="nav-btn-logout"
                data-action="logout"
                title="Sair da sua conta"
                style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817; font-family: 'DM Sans', sans-serif; font-weight: 600;"
              >
                Sair
              </button>`
            : ""
        }
      </div>
    `;
  }

  function buildUnifiedSidebarHtml(session) {
    const loggedIn = Boolean(session && (session.usuario || session.user));
    const onIndex = isIndexPage();

    const currentTheme =
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem(THEME_STORAGE_KEY) ||
      "claro";
    const isLight = currentTheme === "claro";
    const toggleIcon = isLight ? "🌙" : "☀️";
    const toggleTitle = isLight
      ? "Mudar para tema escuro"
      : "Mudar para tema claro";
    const isDaltonico = currentTheme === "daltonico";
    const isContraste = currentTheme === "baixa-visao";
    const currentFontPct =
      Number(localStorage.getItem("mc_acessibilidade_fonte_pct_v2")) || 100;

    // 1. MODO INDEX / VISITANTE DESLOGADO:
    // Exibe SOMENTE os botões de ícone (Claro/Escuro, Daltônico, Alto Contraste), Tamanho de Letra (A-, 100%, A+) e Entrar / Cadastrar.
    if (onIndex || !loggedIn) {
      return `
        <div class="sidebar-brand-header">
          <a href="/index.html" class="sidebar-brand-link d-inline-flex align-items-center gap-2 text-decoration-none">
            <img src="/assets/images/logo.png" class="sidebar-brand-logo" alt="Manejo Caatingueiro" width="38" height="38">
            <div class="sidebar-brand-title">
              <strong style="font-family: 'Newsreader', Georgia, serif; font-weight: 500; color: #542817; font-size: 1.05rem; line-height: 1.15; display: block;">Manejo Caatingueiro</strong>
              <span style="font-family: 'DM Sans', sans-serif; color: #6e6252; font-size: 0.78rem; display: block;">Acessibilidade e Conta</span>
            </div>
          </a>
          <button
            type="button"
            id="sidebar-close"
            class="btn-close-drawer"
            data-close-sidebar
            aria-label="Fechar menu lateral"
            title="Fechar menu"
          >
            ✕
          </button>
        </div>

        <div class="sidebar-guest-card">
          <div class="mb-3">
            <span class="sidebar-section-label">Tema da Tela</span>
            <div
              class="sidebar-theme-grid theme-icon-toolbar"
              role="toolbar"
              aria-label="Tema da Tela"
            >
              <button
                type="button"
                class="theme-icon-btn ${currentTheme === "escuro" ? "active" : ""}"
                id="btn-theme-toggle-light-dark"
                title="${toggleTitle}"
                aria-label="${toggleTitle}"
                aria-pressed="${currentTheme === "escuro" ? "true" : "false"}"
              >
                <span aria-hidden="true">${toggleIcon}</span>
              </button>
              <button
                type="button"
                class="theme-icon-btn ${isDaltonico ? "active" : ""}"
                id="btn-theme-daltonico"
                data-set-theme="daltonico"
                title="Modo para daltônicos"
                aria-label="Modo para daltônicos"
                aria-pressed="${isDaltonico ? "true" : "false"}"
              >
                <span aria-hidden="true">👁️</span>
              </button>
              <button
                type="button"
                class="theme-icon-btn ${isContraste ? "active" : ""}"
                id="btn-theme-contraste"
                data-set-theme="baixa-visao"
                title="Modo alto contraste"
                aria-label="Modo alto contraste"
                aria-pressed="${isContraste ? "true" : "false"}"
              >
                <span aria-hidden="true">◐</span>
              </button>
            </div>
          </div>

          <div>
            <span class="sidebar-section-label">Tamanho da Letra</span>
            <div class="sidebar-font-grid" role="group" aria-label="Definir tamanho de letra">
              <button type="button" class="sidebar-font-btn" data-font-action="dec" title="Diminuir tamanho da letra" aria-label="Diminuir letra">A-</button>
              <button type="button" class="sidebar-font-btn font-scale-display" data-font-action="reset" title="Tamanho padrão da letra (100%)" aria-label="Tamanho padrão da letra">${currentFontPct}%</button>
              <button type="button" class="sidebar-font-btn" data-font-action="inc" title="Aumentar tamanho da letra" aria-label="Aumentar letra">A+</button>
            </div>
          </div>
        </div>

        <div class="mt-auto pt-3 sidebar-footer">
          <div class="sidebar-footer-actions d-grid gap-2">
            <a
              href="/pages/login.html"
              class="sidebar-auth-btn sidebar-auth-btn-primary"
              title="Entrar na sua conta"
            >
              <span aria-hidden="true">🔑</span>
              <span>Entrar</span>
            </a>
            <a
              href="/pages/login.html?modo=cadastro"
              class="sidebar-auth-btn sidebar-auth-btn-secondary"
              title="Criar novo cadastro"
            >
              <span aria-hidden="true">🌱</span>
              <span>Cadastrar</span>
            </a>
          </div>
        </div>
      `;
    }

    // 2. MODO USUÁRIO LOGADO NA SUA CONTA:
    // Exibe as abas completas do painel, seletor de roça, configurações e botão Sair.
    const usuario = session.usuario || session.user || {};
    const primeiroNome = getFirstName(usuario.nome);
    const nomeCompleto = usuario.nome || "Agricultor(a)";
    const rocas = getRocasUsuario();
    const rocaAtiva = getRocaAtiva();
    const settingsOpen =
      localStorage.getItem(SETTINGS_OPEN_STORAGE_KEY) === "true";

    const navItems = [
      {
        href: "/pages/painel.html",
        icon: "🏠",
        label: "Painel do Usuário"
      },
      {
        href: "/pages/perfil.html",
        icon: "🗺️",
        label: "Meu Perfil e Minhas Roças"
      },
      {
        href: "/pages/plantio.html",
        icon: "🌱",
        label: "Recomendações de Plantio"
      },
      {
        href: "/pages/reservatorios.html",
        icon: "💧",
        label: "Cisterna e Poço"
      },
      {
        href: "/pages/comunidade.html",
        icon: "📢",
        label: "Alertas e Mural"
      },
      {
        href: "/pages/assistente-ia.html",
        icon: "💬",
        label: "Assistente da Roça"
      }
    ];

    if (isAdminProfile(usuario)) {
      navItems.push({
        href: "/pages/admin.html",
        icon: "🏛️",
        label: "Administração"
      });
    }

    const linksHtml = navItems
      .map((item) => {
        const cleanHref = item.href.split("?")[0];
        const isActive = isPathActive(cleanHref);
        const activeClass = isActive ? "active" : "";
        const ariaCurrent = isActive ? 'aria-current="page"' : "";
        const linkInlineStyle = isActive
          ? "background-color: #5d603d; color: #fffaf0; font-family: 'DM Sans', sans-serif; font-weight: 600;"
          : "color: #542817; font-family: 'DM Sans', sans-serif; font-weight: 500;";
        return `
          <a href="${item.href}" class="sidebar-link-item sidebar-nav-link nav-link ${activeClass}" ${ariaCurrent} style="${linkInlineStyle}">
            <span class="sidebar-link-icon nav-icon" aria-hidden="true">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `;
      })
      .join("");

    const optionsRocasHtml = rocas
      .map((r) => {
        const selected =
          rocaAtiva && Number(r.id) === Number(rocaAtiva.id) ? "selected" : "";
        return `<option value="${escapeAttr(r.id)}" ${selected}>${escapeAttr(
          formatRocaOptionText(r)
        )}</option>`;
      })
      .join("");

    return `
      <div class="sidebar-brand-header">
        <a href="/pages/painel.html" class="sidebar-brand-link d-inline-flex align-items-center gap-2 text-decoration-none">
          <img src="/assets/images/logo.png" class="sidebar-brand-logo" alt="Manejo Caatingueiro" width="38" height="38">
          <div class="sidebar-brand-title">
            <strong style="font-family: 'Newsreader', Georgia, serif; font-weight: 500; color: #542817; font-size: 1.05rem; line-height: 1.15; display: block;">Manejo Caatingueiro</strong>
            <span style="font-family: 'DM Sans', sans-serif; color: #6e6252; font-size: 0.78rem; display: block;">Sabedoria do Sertão</span>
          </div>
        </a>
        <button
          type="button"
          id="sidebar-close"
          class="btn-close-drawer"
          data-close-sidebar
          aria-label="Fechar menu lateral"
          title="Fechar menu"
        >
          ✕
        </button>
      </div>

      <div class="d-flex align-items-center justify-content-between gap-2 px-1">
        <button
          type="button"
          class="user-badge btn btn-sm w-100 text-start d-flex align-items-center justify-content-between"
          id="user-badge"
          title="Conta: ${escapeAttr(nomeCompleto)} (clique para abrir seu perfil)"
          aria-label="Conta de ${escapeAttr(primeiroNome)}"
          style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817; font-family: 'DM Sans', sans-serif;"
        >
          <span>👤 ${escapeAttr(primeiroNome)}</span>
          <small style="font-size: 0.75rem; color: #6e6252;">Ver perfil →</small>
        </button>
      </div>

      <div class="sidebar-roca-switcher sidebar-roca-selector-box" style="background-color: #fffaf0; border: 1px solid #d2c2a9; border-radius: 10px; padding: 0.65rem;">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <label for="sidebar-select-roca" class="sidebar-roca-label mb-0" style="font-family: 'DM Sans', sans-serif; font-weight: 700; color: #542817;">Roça analisada</label>
          <a href="/pages/perfil.html" class="small fw-bold text-decoration-none" style="font-size: 0.76rem; color: #5d603d;">+ Roças</a>
        </div>
        <select id="sidebar-select-roca" class="form-select form-select-sm sidebar-roca-select" aria-label="Roça analisada">
          ${optionsRocasHtml}
        </select>
      </div>

      <nav class="sidebar-nav-links sidebar-nav-scroll" aria-label="Navegação principal do painel">
        ${linksHtml}
      </nav>

      <div class="mt-auto pt-2 sidebar-footer">
        <button
          type="button"
          class="sidebar-settings-toggle sidebar-settings-trigger"
          id="btn-toggle-sidebar-settings"
          aria-expanded="${settingsOpen ? "true" : "false"}"
          aria-controls="sidebar-settings-panel"
          style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817; font-family: 'DM Sans', sans-serif; font-weight: 600;"
        >
          <span>⚙️ Configurações</span>
          <span class="small" id="sidebar-settings-chevron" aria-hidden="true">${
            settingsOpen ? "▲" : "▼"
          }</span>
        </button>

        <div
          id="sidebar-settings-panel"
          class="sidebar-settings-collapse sidebar-settings-panel ${settingsOpen ? "is-open" : ""}"
          role="region"
          aria-label="Configurações de tema, fonte e voz"
          style="background-color: #fffaf0; border: 1px solid #d2c2a9; color: #542817;"
        >
          <div class="mb-3">
            <span class="sidebar-section-label">Tema da Tela</span>
            <div
              class="sidebar-theme-grid theme-icon-toolbar"
              role="toolbar"
              aria-label="Tema da Tela"
            >
              <button
                type="button"
                class="theme-icon-btn ${currentTheme === "escuro" ? "active" : ""}"
                id="btn-theme-toggle-light-dark"
                title="${toggleTitle}"
                aria-label="${toggleTitle}"
                aria-pressed="${currentTheme === "escuro" ? "true" : "false"}"
              >
                <span aria-hidden="true">${toggleIcon}</span>
              </button>
              <button
                type="button"
                class="theme-icon-btn ${isDaltonico ? "active" : ""}"
                id="btn-theme-daltonico"
                data-set-theme="daltonico"
                title="Modo para daltônicos"
                aria-label="Modo para daltônicos"
                aria-pressed="${isDaltonico ? "true" : "false"}"
              >
                <span aria-hidden="true">👁️</span>
              </button>
              <button
                type="button"
                class="theme-icon-btn ${isContraste ? "active" : ""}"
                id="btn-theme-contraste"
                data-set-theme="baixa-visao"
                title="Modo baixa visão e alto contraste"
                aria-label="Modo baixa visão e alto contraste"
                aria-pressed="${isContraste ? "true" : "false"}"
              >
                <span aria-hidden="true">◐</span>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <span class="sidebar-section-label">Tamanho da Letra</span>
            <div class="sidebar-font-grid" role="group" aria-label="Definir tamanho de letra">
              <button type="button" class="sidebar-font-btn" data-font-action="dec" title="Diminuir tamanho da letra" aria-label="Diminuir letra">A-</button>
              <button type="button" class="sidebar-font-btn font-scale-display" data-font-action="reset" title="Tamanho padrão da letra (100%)" aria-label="Tamanho padrão da letra">${currentFontPct}%</button>
              <button type="button" class="sidebar-font-btn" data-font-action="inc" title="Aumentar tamanho da letra" aria-label="Aumentar letra">A+</button>
            </div>
          </div>

          <div>
            <span class="sidebar-section-label">Leitura em Voz Alta</span>
            <button
              type="button"
              class="btn-sidebar-tts btn-sound-icon w-100 mb-2"
              title="Ouvir resumo desta página"
              aria-label="Ouvir resumo desta página"
            >
              <span aria-hidden="true">🔊</span>
              <span>Ouvir resumo da página</span>
            </button>
            <div class="mt-2">
              <label for="sidebar-tts-speed" class="d-block small mb-1" style="color: #6e6252; font-family: 'DM Sans', sans-serif;">Velocidade da leitura</label>
              <select
                id="sidebar-tts-speed"
                class="form-select form-select-sm w-100 mt-1 sidebar-tts-speed-select"
                data-tts-speed
                aria-label="Velocidade da leitura em voz alta"
              >
                <option value="0.85">Velocidade: Mais devagar (0.85x)</option>
                <option value="1" selected>Velocidade: Normal (1.0x)</option>
                <option value="1.2">Velocidade: Mais rápida (1.2x)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="sidebar-footer-actions mt-2 d-grid gap-2">
          <button
            type="button"
            class="btn btn-sm w-100 btn-sidebar-logout"
            id="btn-logout"
            data-action="logout"
          >
            🚪 Sair da conta
          </button>
        </div>
      </div>
    `;
  }

  function ensureUnifiedSidebarShell(session) {
    let shell = document.querySelector(".app-layout-shell");
    let topbar = document.querySelector(".app-topbar, .app-mobile-topbar");
    let sidebar = document.querySelector(".app-sidebar-nav");
    let backdrop = document.querySelector(".app-sidebar-backdrop");
    let workspace = document.querySelector(".app-main-workspace");
    const rocaAtiva = getRocaAtiva();
    const loggedIn = Boolean(session && session.usuario);

    // Oculta a antiga navbar horizontal superior quando o layout em Aba Lateral Retrátil está ativo
    const legacyHeader = document.querySelector("body > header.sticky-top, body > header");
    const legacyNavMenu = document.getElementById("menu");
    if (legacyHeader && (!sidebar || !legacyHeader.contains(sidebar))) {
      legacyHeader.classList.add("d-none");
      legacyHeader.hidden = true;
    } else if (
      legacyNavMenu &&
      !legacyNavMenu.classList.contains("app-sidebar-nav")
    ) {
      legacyNavMenu.classList.add("d-none");
      legacyNavMenu.hidden = true;
    }

    if (!shell) {
      shell = document.createElement("div");
      shell.className = "app-layout-shell";

      topbar = document.createElement("header");
      topbar.className = "app-topbar";
      topbar.id = "app-topbar";
      topbar.style.backgroundColor = "#f4eddb";
      topbar.style.borderBottom = "1px solid #d2c2a9";
      topbar.innerHTML = buildLoggedTopbarHtml(rocaAtiva, loggedIn);

      sidebar = document.createElement("aside");
      sidebar.className = "app-sidebar-nav";
      sidebar.style.backgroundColor = "#f4eddb";
      sidebar.style.borderRight = "1px solid #d2c2a9";
      if (!document.getElementById("menu")) {
        sidebar.id = "menu";
      } else {
        sidebar.id = "app-sidebar";
      }
      sidebar.setAttribute("aria-label", "Menu Lateral Retrátil");

      backdrop = document.createElement("div");
      backdrop.className = "app-sidebar-backdrop";
      backdrop.id = "sidebar-backdrop";

      workspace = document.createElement("div");
      workspace.className = "app-main-workspace";

      const mainEl = document.querySelector("main");
      const footerEl = document.querySelector("body > footer");

      if (mainEl && mainEl.parentNode) {
        mainEl.parentNode.insertBefore(shell, mainEl);
        workspace.appendChild(mainEl);
      } else {
        document.body.prepend(shell);
      }

      if (footerEl) {
        workspace.appendChild(footerEl);
      }

      shell.appendChild(topbar);
      shell.appendChild(sidebar);
      shell.appendChild(backdrop);
      shell.appendChild(workspace);
    } else {
      if (!topbar) {
        topbar = document.createElement("header");
        shell.prepend(topbar);
      }
      topbar.className = "app-topbar";
      topbar.id = "app-topbar";
      topbar.style.backgroundColor = "#f4eddb";
      topbar.style.borderBottom = "1px solid #d2c2a9";
      topbar.innerHTML = buildLoggedTopbarHtml(rocaAtiva, loggedIn);

      if (!sidebar) {
        sidebar = document.createElement("aside");
        sidebar.className = "app-sidebar-nav";
        shell.insertBefore(sidebar, workspace || null);
      }
      sidebar.style.backgroundColor = "#f4eddb";
      sidebar.style.borderRight = "1px solid #d2c2a9";
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "app-sidebar-backdrop";
        backdrop.id = "sidebar-backdrop";
        shell.insertBefore(backdrop, workspace || null);
      }
    }

    // Garante que a gaveta lateral permanece fechada por padrão em todas as telas
    sidebar.classList.remove("is-open", "open");
    if (backdrop) {
      backdrop.classList.remove("is-open", "open", "is-visible");
    }

    sidebar.innerHTML = buildUnifiedSidebarHtml(session);
    populateSidebarRocaSelector();
    bindUnifiedSidebarEvents(sidebar, backdrop);
    syncRocasFromBackend();
  }

  function bindUnifiedSidebarEvents(sidebar, backdrop) {
    if (!sidebar) return;

    function openDrawerSidebar() {
      sidebar.classList.add("is-open", "open");
      if (backdrop) backdrop.classList.add("is-open", "open", "is-visible");
      document
        .querySelectorAll("[data-open-sidebar]")
        .forEach((b) => b.setAttribute("aria-expanded", "true"));
    }

    function closeDrawerSidebar() {
      sidebar.classList.remove("is-open", "open");
      if (backdrop) backdrop.classList.remove("is-open", "open", "is-visible");
      document
        .querySelectorAll("[data-open-sidebar]")
        .forEach((b) => b.setAttribute("aria-expanded", "false"));
    }

    document.querySelectorAll("[data-open-sidebar]").forEach((btn) => {
      if (btn.dataset.boundSidebarOpen) return;
      btn.dataset.boundSidebarOpen = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (sidebar.classList.contains("is-open")) {
          closeDrawerSidebar();
        } else {
          openDrawerSidebar();
        }
      });
    });

    sidebar.querySelectorAll("[data-close-sidebar]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        closeDrawerSidebar();
      });
    });

    if (backdrop && !backdrop.dataset.boundBackdropClick) {
      backdrop.dataset.boundBackdropClick = "true";
      backdrop.addEventListener("click", closeDrawerSidebar);
    }

    sidebar.querySelectorAll(".sidebar-link-item").forEach((link) => {
      link.addEventListener("click", () => {
        closeDrawerSidebar();
      });
    });

    const settingsBtn = sidebar.querySelector("#btn-toggle-sidebar-settings");
    const settingsPanel = sidebar.querySelector("#sidebar-settings-panel");
    const chevron = sidebar.querySelector("#sidebar-settings-chevron");
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = settingsPanel.classList.toggle("is-open");
        settingsBtn.setAttribute("aria-expanded", String(isOpen));
        if (chevron) chevron.textContent = isOpen ? "▲" : "▼";
        try {
          localStorage.setItem(SETTINGS_OPEN_STORAGE_KEY, String(isOpen));
        } catch {}
      });
    }

    const rocaSelect = sidebar.querySelector("#sidebar-select-roca");
    if (rocaSelect) {
      rocaSelect.addEventListener("change", (e) => {
        setRocaAtiva(Number(e.target.value));
      });
    }
  }

  function syncSessionVisibility(loggedIn, session) {
    const workspaceEl = document.getElementById("logged-manejo-workspace");
    if (workspaceEl) {
      if (loggedIn && !isIndexPage()) {
        workspaceEl.hidden = false;
        workspaceEl.removeAttribute("hidden");
        workspaceEl.classList.remove("d-none");
      } else {
        workspaceEl.hidden = true;
      }
    }

    const userBadge = document.getElementById("user-badge");
    if (userBadge && loggedIn && session?.usuario) {
      const firstName = getFirstName(session.usuario.nome);
      if (!userBadge.querySelector("span")) {
        userBadge.textContent = firstName;
      }
    }
  }

  function refreshNavbarState() {
    removeSkipLinksFromDom();
    const session = getAuthSession();
    const loggedIn = Boolean(session && (session.usuario || session.user));
    const forceHome = window.location.search.includes("ver=inicio");

    // 1. Se o usuário estiver em /index.html e já tiver sessão ativa (sem ?ver=inicio), redireciona para /pages/painel.html
    if (loggedIn && isIndexPage() && !forceHome) {
      window.location.replace("/pages/painel.html");
      return;
    }

    // 2. Se o usuário NÃO estiver logado e tentar acessar uma aba exclusiva da conta, redireciona para /pages/login.html
    if (!loggedIn && isLoggedPanelPage()) {
      window.location.replace("/pages/login.html");
      return;
    }

    // 3. Injeta a Barra Superior Sutil (.app-topbar) + Gaveta Lateral Retrátil (.app-sidebar-nav)
    ensureUnifiedSidebarShell(session);

    if (loggedIn && !isIndexPage()) {
      populateSidebarRocaSelector();
    }
    syncSessionVisibility(loggedIn, session);
    bindLogoutButtons();
    bindUserBadgeClick();

    if (window.MC_Voz && typeof window.MC_Voz.sincronizarBotoes === "function") {
      window.MC_Voz.sincronizarBotoes();
    }
  }

  function initSidebarMenu() {
    removeSkipLinksFromDom();
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllSidebarsImmediately();
        closeLogoutModal();
      }
    });

    refreshNavbarState();

    window.addEventListener("storage", (event) => {
      if (
        event.key === AUTH_STORAGE_KEY ||
        event.key === THEME_STORAGE_KEY ||
        event.key === ROCA_ATIVA_STORAGE_KEY ||
        event.key === ROCAS_CACHE_STORAGE_KEY
      ) {
        cachedRocas = null;
        refreshNavbarState();
      }
    });

    window.addEventListener("mc:auth-changed", () => {
      cachedRocas = null;
      refreshNavbarState();
    });
  }

  window.MC_Menu = {
    getAuthSession,
    isLoggedIn,
    getRocaAtiva,
    setRocaAtiva,
    getRocasUsuario,
    syncRocasFromBackend,
    refreshNavbarState,
    openLogoutModal,
    closeLogoutModal,
    executeLogout
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarMenu);
  } else {
    initSidebarMenu();
  }
})();

