/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — CLIMA-DINAMICO.JS
   Troca dinâmica da ilustração do estado hídrico da roça (Favorável / Atenção / Estiagem)
   ========================================================================== */

const ESTADOS_CLIMA = {
  favoravel: {
    imagem: "/assets/images/roca-favoravel.svg",
    titulo: "Condição Hídrica Favorável",
    descricao: "Solo com umidade adequada e acumulado dentro ou acima da referência para a janela de plantio."
  },
  atencao: {
    imagem: "/assets/images/roca-atencao.svg",
    titulo: "Transição · Atenção ao Solo",
    descricao: "Chuvas esparsas na localidade. Avalie aguardar nova precipitação ou ajustar o manejo."
  },
  estiagem: {
    imagem: "/assets/images/roca-estiagem.svg",
    titulo: "Abaixo do Esperado · Estiagem",
    descricao: "Volume acumulado abaixo da normal do mês. Priorize culturas resistentes como mamona ou sorgo."
  }
};

function atualizarIlustracaoClimatica(estadoChave) {
  const estado = ESTADOS_CLIMA[estadoChave] || ESTADOS_CLIMA.atencao;
  const imgEl = document.querySelector("#clima-dinamico-img");
  const tituloEl = document.querySelector("#clima-dinamico-titulo");
  const descEl = document.querySelector("#clima-dinamico-desc");

  if (imgEl) {
    imgEl.src = estado.imagem;
    imgEl.alt = estado.titulo;
  }
  if (tituloEl) tituloEl.textContent = estado.titulo;
  if (descEl) descEl.textContent = estado.descricao;

  document.querySelectorAll("[data-clima-preview]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.climaPreview === estadoChave);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-clima-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      atualizarIlustracaoClimatica(btn.dataset.climaPreview);
    });
  });
});

window.atualizarIlustracaoClimatica = atualizarIlustracaoClimatica;
