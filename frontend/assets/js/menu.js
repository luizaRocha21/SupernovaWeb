/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — MENU.JS
   Controle do menu responsivo (mobile e desktop) e navegação entre seções
   ========================================================================== */

(function () {
  function initMenu() {
    const menuToggle = document.querySelector("#menu-toggle");
    const mainNav = document.querySelector("#main-nav");

    if (menuToggle && mainNav) {
      menuToggle.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        const labelSpan = menuToggle.querySelector(".menu-toggle-label");
        if (labelSpan) {
          labelSpan.textContent = isOpen ? "Fechar" : "Menu";
        }
      });
    }

    // Fecha o menu mobile automaticamente ao selecionar uma visão
    document.querySelectorAll(".nav-link, [data-go-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (mainNav && mainNav.classList.contains("open")) {
          mainNav.classList.remove("open");
          if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
            const labelSpan = menuToggle.querySelector(".menu-toggle-label");
            if (labelSpan) labelSpan.textContent = "Menu";
          }
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }
})();
