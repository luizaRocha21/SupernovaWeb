/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — CLIMA-DINAMICO.JS
   Diagnóstico automático da situação da roça (Favorável / Atenção / Estiagem)
   e orientações práticas de como agir no manejo do plantio
   ========================================================================== */

const ESTADOS_CLIMA = {
  favoravel: {
    imagem: "/assets/images/roca-favoravel.svg",
    selo: "Situação Favorável",
    classeSelo: "status-good",
    titulo: "Situação Favorável para o Plantio",
    descricao: "Solo com umidade adequada e volume de chuva dentro do esperado para a janela de plantio.",
    passosPadrao: [
      "Realize a semeadura nas horas mais frescas (início da manhã ou final da tarde).",
      "Mantenha palhada e cobertura morta sobre o solo para conservar a umidade por mais dias.",
      "Mantenha calhas da cisterna e sulcos em nível limpos para aproveitar as próximas chuvas."
    ]
  },
  atencao: {
    imagem: "/assets/images/roca-atencao.svg",
    selo: "Situação de Atenção",
    classeSelo: "status-warn",
    titulo: "Transição · Atenção à Umidade do Solo",
    descricao: "Chuvas moderadas ou irregulares na localidade. Avalie a umidade da terra antes de semear áreas maiores.",
    passosPadrao: [
      "Teste a umidade da terra a 15 cm de profundidade antes de lançar as sementes.",
      "Abra sulcos em nível ou covas para segurar a água da próxima pancada de chuva.",
      "Prefira plantio escalonado ou consorciado com feijão-caupi e mamona."
    ]
  },
  estiagem: {
    imagem: "/assets/images/roca-estiagem.svg",
    selo: "Situação de Estiagem",
    classeSelo: "status-alert",
    titulo: "Estiagem · Abaixo do Esperado",
    descricao: "Volume acumulado abaixo da referência do mês. Proteja o solo e evite perda de sementes sensíveis.",
    passosPadrao: [
      "Aguarde novas chuvas antes de semear culturas sensíveis como o milho.",
      "Se precisar manejar agora, priorize culturas resistentes à seca (mamona, sorgo ou palma).",
      "Não deixe o solo descoberto sob o sol forte e preserve a água da cisterna."
    ]
  }
};

function atualizarIlustracaoClimatica(estadoChave, diagnosticoApi = null) {
  const chave = ESTADOS_CLIMA[estadoChave] ? estadoChave : "atencao";
  const estado = ESTADOS_CLIMA[chave];

  const imgEl = document.querySelector("#clima-dinamico-img");
  const badgeEl = document.querySelector("#clima-situacao-badge");
  const tituloEl = document.querySelector("#clima-dinamico-titulo");
  const descEl = document.querySelector("#clima-dinamico-desc");
  const passosEl = document.querySelector("#manejo-passos-list");

  if (imgEl) {
    imgEl.src = estado.imagem;
    imgEl.alt = diagnosticoApi?.rotulo || estado.titulo;
  }

  if (badgeEl) {
    badgeEl.className = `status-label ${estado.classeSelo}`;
    badgeEl.textContent = diagnosticoApi?.rotulo || estado.selo;
  }

  if (tituloEl) {
    tituloEl.textContent = diagnosticoApi?.rotulo || estado.titulo;
  }

  if (descEl) {
    descEl.textContent = diagnosticoApi?.resumo || estado.descricao;
  }

  if (passosEl) {
    const lista = Array.isArray(diagnosticoApi?.acoesManejo) && diagnosticoApi.acoesManejo.length > 0
      ? diagnosticoApi.acoesManejo
      : estado.passosPadrao;
    passosEl.innerHTML = lista
      .map((item) => `<li>${item}</li>`)
      .join("");
  }
}

window.atualizarIlustracaoClimatica = atualizarIlustracaoClimatica;
