/* ==========================================================================
   MANEJO CAATINGUEIRO — ACESSIBILIDADE, MENU DE TEMAS E LEITURA POR IA (VOZ)
   - Temas no menu lateral: Claro, Escuro, Daltônico e Baixa Visão
   - Ajuste de fonte (A-, 100%, A+) persistido localmente
   - Botão único de som (🔊) com resumo natural gerado por IA (/api/v1/ia/resumo-voz)
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

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(STORAGE_THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "baixa-visao" && currentFontPct < 125) {
      applyFontScale(130);
    }

    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      const active = btn.getAttribute("data-set-theme") === theme;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function applyFontScale(pct) {
    const clamped = Math.min(145, Math.max(90, Number(pct) || 100));
    currentFontPct = clamped;
    localStorage.setItem(STORAGE_FONT_KEY, String(clamped));
    document.documentElement.style.setProperty("--font-scale", String(clamped / 100));

    document.querySelectorAll(".font-scale-display").forEach((el) => {
      el.textContent = `${clamped}%`;
    });
  }

  function updateSoundButtonsState(reading) {
    isReading = reading;
    document.querySelectorAll("#btn-tts-icon, .btn-sound-icon:not(.btn-chat-icon)").forEach((btn) => {
      btn.classList.toggle("is-speaking", reading);
      btn.setAttribute(
        "aria-label",
        reading ? "Parar leitura em voz alta" : "Ouvir resumo em áudio desta página"
      );
      btn.setAttribute(
        "title",
        reading ? "Clique para parar o áudio" : "Ouvir resumo da página"
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
          currentAudio.volume = Math.min(1, Math.max(0.1, Number(ttsConfig.volume) || 1.0));
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
      utter.rate = Math.min(2.0, Math.max(0.6, Number(ttsConfig.velocidade) || 1.0));
      utter.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find((v) => v.lang && v.lang.toLowerCase().includes("pt-br") && v.name.toLowerCase().includes("google")) ||
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
    const locSelect = document.querySelector("#select-localidade");
    const localidadeId = locSelect && locSelect.value ? Number(locSelect.value) : 1;
    const activeCropBtn = document.querySelector(".crop-tab.active");
    const cultura = activeCropBtn ? activeCropBtn.dataset.crop || "milho" : "milho";
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

    // Fallback caso offline
    if (!authToken) {
      await playSpeechText(
        "Bem-vindo ao Manejo Caatingueiro! Aqui você pode acompanhar o manejo da sua roça, tirar dúvidas com seu assistente de inteligência artificial e cuidar da água da sua propriedade. Entre na sua conta para começar."
      );
      return;
    }
    const locName = locSelect?.options?.[locSelect.selectedIndex]?.text || "Irecê";
    const rainMonth = document.querySelector("#metric-month")?.textContent || "--";
    const statusTitle = document.querySelector("#decision-title")?.textContent || "em análise";
    const statusCopy = document.querySelector("#decision-copy")?.textContent || "";
    const fallbackText = `Resumo da sua roça em ${locName}. Acumulado do mês: ${rainMonth}. Situação atual: ${statusTitle}. ${statusCopy}`;
    await playSpeechText(fallbackText);
  }

  function bindAccessibilityControls() {
    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyTheme(btn.getAttribute("data-set-theme") || "claro");
      });
    });

    document.querySelectorAll("[data-font-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-font-action");
        if (action === "reset") {
          applyFontScale(100);
          return;
        }
        const idx = FONT_STEPS.findIndex((s) => s >= currentFontPct);
        const currentIdx = idx === -1 ? FONT_STEPS.length - 1 : idx;
        if (action === "dec") {
          applyFontScale(FONT_STEPS[Math.max(0, currentIdx - 1)]);
        } else if (action === "inc") {
          applyFontScale(FONT_STEPS[Math.min(FONT_STEPS.length - 1, currentIdx + 1)]);
        }
      });
    });

    document.querySelectorAll("[data-tts-speed]").forEach((sel) => {
      sel.value = String(ttsConfig.velocidade || 1.0);
      sel.addEventListener("change", (e) => {
        ttsConfig.velocidade = Number(e.target.value) || 1.0;
        localStorage.setItem(STORAGE_TTS_KEY, JSON.stringify(ttsConfig));
      });
    });

    document.querySelectorAll("#btn-tts-icon, .btn-sound-icon:not(.btn-chat-icon)").forEach((btn) => {
      btn.addEventListener("click", togglePageSummaryAudio);
    });

    if (window.location.pathname.includes("/pages/") && !window.location.pathname.includes("assistente-ia.html")) {
      const chatBtn = document.querySelector("#btn-chat-ia-icon");
      if (chatBtn) {
        let hasAuth = false;
        try {
          const raw = localStorage.getItem("mc_auth_session_v4");
          const parsed = raw ? JSON.parse(raw) : null;
          hasAuth = Boolean(parsed && parsed.token && parsed.user);
        } catch {}
        chatBtn.classList.toggle("is-locked", !hasAuth);
        chatBtn.addEventListener("click", () => {
          if (!hasAuth) {
            window.location.href = "/?aviso=login-ia";
          } else {
            window.location.href = "/pages/assistente-ia.html";
          }
        });
      }
    }
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
    aplicarFonte: applyFontScale
  };
})();
