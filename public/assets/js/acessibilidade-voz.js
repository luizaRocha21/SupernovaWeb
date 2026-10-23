/* ==========================================================================
   MANEJO CAATINGUEIRO — ACESSIBILIDADE, TEMAS E LEITURA EM VOZ ALTA
   Sincronizado com o Menu Retrátil de Configurações (#btn-toggle-sidebar-settings)
   da Aba Lateral Unificada (.app-sidebar-nav) e com a Roça Ativa (MC_Menu.getRocaAtiva)
   ========================================================================== */

(function () {
  const STORAGE_THEME_KEY = "mc_acessibilidade_tema_v2";
  const STORAGE_FONT_KEY = "mc_acessibilidade_fonte_pct_v2";
  const STORAGE_TTS_KEY = "mc_acessibilidade_tts_cfg_v2";

  const FONT_STEPS = [90, 100, 115, 130, 145];

  let currentTheme = localStorage.getItem(STORAGE_THEME_KEY) || "claro";
  let currentFontPct = Number(localStorage.getItem(STORAGE_FONT_KEY)) || 100;
  let ttsConfig = { velocidade: 1.0, volume: 1.0 };

  try {
    const savedTts = JSON.parse(localStorage.getItem(STORAGE_TTS_KEY) || "{}");
    ttsConfig = { ...ttsConfig, ...savedTts };
  } catch {}

  let currentAudio = null;
  let isReading = false;
  let delegatedEventsBound = false;

  function syncThemeButtonsUI() {
    const isLight = currentTheme === "claro";
    const toggleIcon = isLight ? "🌙" : "☀️";
    const toggleTitle = isLight
      ? "Mudar para tema escuro"
      : "Mudar para tema claro";

    document.querySelectorAll("#btn-theme-toggle-light-dark").forEach((btn) => {
      btn.innerHTML = `<span aria-hidden="true">${toggleIcon}</span>`;
      btn.setAttribute("title", toggleTitle);
      btn.setAttribute("aria-label", toggleTitle);
      const isDarkActive = currentTheme === "escuro";
      btn.classList.toggle("active", isDarkActive);
      btn.setAttribute("aria-pressed", String(isDarkActive));
    });

    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      const targetTheme = btn.getAttribute("data-set-theme");
      const active = targetTheme === currentTheme;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    document.querySelectorAll(".font-scale-display").forEach((el) => {
      el.textContent = `${currentFontPct}%`;
    });

    document.querySelectorAll("[data-tts-speed]").forEach((sel) => {
      sel.value = String(ttsConfig.velocidade || 1.0);
    });

    updateSoundButtonsState(isReading);
  }

  function applyTheme(theme) {
    currentTheme = theme || "claro";
    localStorage.setItem(STORAGE_THEME_KEY, currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);

    if (currentTheme === "baixa-visao" && currentFontPct < 125) {
      applyFontScale(130);
    }

    syncThemeButtonsUI();
  }

  function applyFontScale(pct) {
    const clamped = Math.min(145, Math.max(90, Number(pct) || 100));
    currentFontPct = clamped;
    localStorage.setItem(STORAGE_FONT_KEY, String(clamped));
    document.documentElement.style.setProperty(
      "--font-scale",
      String(clamped / 100)
    );

    document.querySelectorAll(".font-scale-display").forEach((el) => {
      el.textContent = `${clamped}%`;
    });
  }

  function updateSoundButtonsState(reading) {
    isReading = reading;
    document
      .querySelectorAll("#btn-tts-icon, .btn-sound-icon:not(.btn-chat-icon)")
      .forEach((btn) => {
        btn.classList.toggle("is-speaking", reading);
        btn.classList.toggle("active", reading);
        const isFullButton =
          btn.textContent && btn.textContent.trim().length > 4;
        if (isFullButton) {
          btn.innerHTML = reading
            ? "⏹️ Parar leitura em voz alta"
            : "🔊 Ouvir resumo da página";
        }
        btn.setAttribute(
          "aria-label",
          reading
            ? "Parar leitura em voz alta"
            : "Ouvir resumo desta página"
        );
        btn.setAttribute(
          "title",
          reading ? "Clique para parar o áudio" : "Ouvir resumo desta página"
        );
      });
  }

  function stopReading() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    updateSoundButtonsState(false);
  }

  async function playSpeechText(texto) {
    if (!texto || !String(texto).trim()) return;
    stopReading();
    updateSoundButtonsState(true);

    const apiBase = window.MC_API_BASE || "";
    try {
      const resp = await fetch(`${apiBase}/api/v1/tts/sintetizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          velocidade: ttsConfig.velocidade,
          entonacao: 0,
          voz: "pt-BR-Neural2-B"
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.audioBase64) {
          const mime = data.mimeType || "audio/mp3";
          currentAudio = new Audio(`data:${mime};base64,${data.audioBase64}`);
          currentAudio.volume = Math.min(
            1,
            Math.max(0.1, Number(ttsConfig.volume) || 1.0)
          );
          currentAudio.onended = () => updateSoundButtonsState(false);
          currentAudio.onerror = () => fallbackBrowserSpeech(texto);
          await currentAudio.play();
          return;
        }
      }
    } catch {}

    fallbackBrowserSpeech(texto);
  }

  function fallbackBrowserSpeech(texto) {
    if (!("speechSynthesis" in window)) {
      updateSoundButtonsState(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(texto);
      utter.lang = "pt-BR";
      utter.rate = Math.min(
        2.0,
        Math.max(0.6, Number(ttsConfig.velocidade) || 1.0)
      );
      utter.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find(
          (v) =>
            v.lang &&
            v.lang.toLowerCase().includes("pt-br") &&
            v.name.toLowerCase().includes("google")
        ) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().includes("pt-br")) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("pt"));
      if (ptVoice) utter.voice = ptVoice;

      utter.onend = () => updateSoundButtonsState(false);
      utter.onerror = () => updateSoundButtonsState(false);
      window.speechSynthesis.speak(utter);
    } catch {
      updateSoundButtonsState(false);
    }
  }

  async function togglePageSummaryAudio() {
    if (isReading) {
      stopReading();
      return;
    }

    updateSoundButtonsState(true);
    const rocaAtiva =
      window.MC_Menu && typeof window.MC_Menu.getRocaAtiva === "function"
        ? window.MC_Menu.getRocaAtiva()
        : null;
    const locSelect = document.querySelector("#select-localidade");
    const localidadeId =
      locSelect && locSelect.value
        ? Number(locSelect.value)
        : Number(rocaAtiva?.localidadeId) || 1;
    const activeCropBtn = document.querySelector(".crop-tab.active");
    const cultura = activeCropBtn
      ? activeCropBtn.dataset.crop || "milho"
      : "milho";
    const activeView = document.querySelector(".view-section.active");
    const secao = activeView ? activeView.id : "painel";

    const apiBase = window.MC_API_BASE || "";
    let authToken = null;
    try {
      const rawAuth = localStorage.getItem("mc_auth_session_v4");
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        authToken = parsed?.token || null;
      }
    } catch {}

    const headers = { "Content-Type": "application/json" };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const resp = await fetch(`${apiBase}/api/v1/ia/resumo-voz`, {
        method: "POST",
        headers,
        body: JSON.stringify({ localidadeId, cultura, secao })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.resumoFalado) {
          await playSpeechText(data.resumoFalado);
          return;
        }
      }
    } catch {}

    if (!authToken) {
      await playSpeechText(
        "Bem-vindo ao Manejo Caatingueiro! Aqui você pode acompanhar o manejo da sua roça, tirar dúvidas com seu assistente de inteligência artificial e cuidar da água da sua propriedade. Entre na sua conta para começar."
      );
      return;
    }

    const locName =
      rocaAtiva?.nome
        ? `${rocaAtiva.nome} em ${rocaAtiva.municipioNome}`
        : locSelect?.options?.[locSelect.selectedIndex]?.text || "Irecê";
    const rainMonth =
      document.querySelector("#metric-month")?.textContent || "--";
    const statusTitle =
      document.querySelector("#decision-title")?.textContent || "em análise";
    const statusCopy =
      document.querySelector("#decision-copy")?.textContent || "";
    const fallbackText = `Resumo da sua ${locName}. Acumulado do mês: ${rainMonth}. Situação atual: ${statusTitle}. ${statusCopy}`;
    await playSpeechText(fallbackText);
  }

  function bindAccessibilityControls() {
    syncThemeButtonsUI();

    if (delegatedEventsBound) return;
    delegatedEventsBound = true;

    // Delegação global para controles de velocidade da fala (incluindo o da Sidebar)
    document.addEventListener("change", (e) => {
      const speedSel = e.target.closest("[data-tts-speed]");
      if (speedSel) {
        ttsConfig.velocidade = Number(speedSel.value) || 1.0;
        localStorage.setItem(STORAGE_TTS_KEY, JSON.stringify(ttsConfig));
        document.querySelectorAll("[data-tts-speed]").forEach((s) => {
          if (s !== speedSel) s.value = String(ttsConfig.velocidade);
        });
      }
    });

    // Delegação global de cliques para temas, fonte e leitura em voz alta
    document.addEventListener("click", (e) => {
      const toggleLightDarkBtn = e.target.closest(
        "#btn-theme-toggle-light-dark"
      );
      if (toggleLightDarkBtn) {
        e.preventDefault();
        if (currentTheme === "claro") {
          applyTheme("escuro");
        } else {
          applyTheme("claro");
        }
        return;
      }

      const setThemeBtn = e.target.closest("[data-set-theme]");
      if (setThemeBtn) {
        e.preventDefault();
        const targetTheme =
          setThemeBtn.getAttribute("data-set-theme") || "claro";
        const isIconToggle =
          setThemeBtn.id === "btn-theme-daltonico" ||
          setThemeBtn.id === "btn-theme-contraste" ||
          setThemeBtn.classList.contains("theme-icon-btn");

        if (isIconToggle && currentTheme === targetTheme) {
          if (targetTheme === "baixa-visao") {
            applyFontScale(100);
          }
          applyTheme("claro");
        } else {
          applyTheme(targetTheme);
        }
        return;
      }

      const fontBtn = e.target.closest("[data-font-action]");
      if (fontBtn) {
        e.preventDefault();
        const action = fontBtn.getAttribute("data-font-action");
        if (action === "reset") {
          applyFontScale(100);
          return;
        }
        const idx = FONT_STEPS.findIndex((s) => s >= currentFontPct);
        const currentIdx = idx === -1 ? FONT_STEPS.length - 1 : idx;
        if (action === "dec") {
          applyFontScale(FONT_STEPS[Math.max(0, currentIdx - 1)]);
        } else if (action === "inc") {
          applyFontScale(
            FONT_STEPS[Math.min(FONT_STEPS.length - 1, currentIdx + 1)]
          );
        }
        return;
      }

      const ttsBtn = e.target.closest(
        "#btn-tts-icon, .btn-sound-icon:not(.btn-chat-icon)"
      );
      if (ttsBtn) {
        e.preventDefault();
        togglePageSummaryAudio();
      }
    });
  }

  function init() {
    applyTheme(currentTheme);
    applyFontScale(currentFontPct);
    bindAccessibilityControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.MC_Voz = {
    lerTexto: playSpeechText,
    parar: stopReading,
    ouvirResumoIa: togglePageSummaryAudio,
    aplicarTema: applyTheme,
    aplicarFonte: applyFontScale,
    sincronizarBotoes: syncThemeButtonsUI
  };
})();
