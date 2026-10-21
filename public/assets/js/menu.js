/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — MENU.JS
   Controle do Menu Lateral (Sidebar) responsivo, navegação e atalhos de configuração
   ========================================================================== */

(function () {
  function initSidebarMenu() {
    const sidebar = document.querySelector("#app-sidebar");
    const backdrop = document.querySelector("#sidebar-backdrop");
    const openBtns = document.querySelectorAll("#menu-toggle, [data-open-sidebar]");
    const closeBtns = document.querySelectorAll("#sidebar-close, [data-close-sidebar]");

    function openSidebar() {
      if (!sidebar) return;
      sidebar.classList.add("open");
      sidebar.setAttribute("aria-hidden", "false");
      if (backdrop) backdrop.classList.add("open");
      openBtns.forEach((btn) => btn.setAttribute("aria-expanded", "true"));
    }

    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.remove("open");
      sidebar.setAttribute("aria-hidden", "true");
      if (backdrop) backdrop.classList.remove("open");
      openBtns.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
    }

    openBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (sidebar && sidebar.classList.contains("open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    });

    closeBtns.forEach((btn) => {
      btn.addEventListener("click", closeSidebar);
    });

    if (backdrop) {
      backdrop.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      }
    });

    // Fecha o menu lateral automaticamente ao escolher uma seção de navegação
    document.querySelectorAll(".sidebar-nav-btn, .nav-link, [data-go-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeSidebar();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarMenu);
  } else {
    initSidebarMenu();
  }
})();
