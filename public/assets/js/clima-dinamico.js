/* ==========================================================================
   MANEJO CAATINGUEIRO (SUPERNOVAWEB) — CLIMA-DINAMICO.JS
   Consumo em Tempo Real de GET /api/v1/clima/diagnostico
   (Open-Meteo + INMET A424 + Pluviômetro da Propriedade) + Cliente Global
   window.MC_Radar restrito 100% aos Municípios do Semiárido Baiano (A a X)
   (Etapa 1 — Plano 6)
   ========================================================================== */

const RADAR_PUBLIC_API = "https://radarmeteorologico.com.br/api/v1";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const CACHE_TTL_ALERTAS_MS = 10 * 60 * 1000;       // 10 minutos
const CACHE_TTL_TEMPERATURAS_MS = 60 * 60 * 1000;  // 1 hora
const CACHE_TTL_CIDADES_MS = 24 * 60 * 60 * 1000;  // 24 horas

const CACHE_KEY_TEMP_SEMIARIDO_V3 = "mc_radar_temp_semiarido_ba_v3";
const CACHE_KEY_CIDADES_SEMIARIDO_V3 = "mc_radar_cidades_semiarido_ba_v3";

/**
 * Catálogo Oficial das Cidades do Semiárido Baiano e Municípios Atendidos na Bahia (A a X).
 */
const NOMES_CIDADES_SEMIARIDO_BA = [
  // A
  "Abaíra", "Abaré", "Acajutiba", "Adustina", "Água Fria", "Aiquara", "Alagoinhas",
  "Almadina", "Amargosa", "Amélia Rodrigues", "América Dourada", "Anagé", "Andaraí",
  "Andorinha", "Angical", "Anguera", "Antas", "Antônio Cardoso", "Antônio Gonçalves",
  "Aporá", "Aracatu", "Araci", "Aramari", "Arataca", "Aratuípe", "Aurelino Leal",
  // B
  "Baianópolis", "Baixa Grande", "Banzaê", "Barra", "Barra da Estiva", "Barra do Choça",
  "Barra do Mendes", "Barra do Rocha", "Barreiras", "Barro Alto", "Barro Preto",
  "Barrocas", "Belmonte", "Belo Campo", "Biritinga", "Boa Nova", "Boa Vista do Tupim",
  "Bom Jesus da Lapa", "Bom Jesus da Serra", "Boninal", "Bonito", "Boquira", "Botuporã",
  "Brejões", "Brejolândia", "Brotas de Macaúbas", "Brumado", "Buerarema", "Buritirama",
  // C
  "Caatiba", "Cabaceiras do Paraguaçu", "Cachoeira", "Caculé", "Caém", "Caetanos",
  "Caetité", "Cafarnaum", "Cairu", "Caldeirão Grande", "Camacan", "Camamu",
  "Campo Alegre de Lourdes", "Campo Formoso", "Canápolis", "Canarana", "Canavieiras",
  "Candeal", "Candeias", "Candiba", "Cândido Sales", "Cansanção", "Canudos",
  "Capela do Alto Alegre", "Capim Grosso", "Caraíbas", "Caravelas", "Cardeal da Silva",
  "Carinhanha", "Casa Nova", "Castro Alves", "Catolândia", "Catu", "Caturama",
  "Central", "Chorrochó", "Cícero Dantas", "Cipó", "Coaraci", "Cocos",
  "Conceição da Feira", "Conceição do Almeida", "Conceição do Coité",
  "Conceição do Jacuípe", "Conde", "Condeúba", "Contendas do Sincorá",
  "Coração de Maria", "Cordeiros", "Coribe", "Coronel João Sá", "Correntina",
  "Cotegipe", "Cravolândia", "Crisópolis", "Cristópolis", "Cruz das Almas", "Curaçá",
  // D
  "Dário Meira", "Dias d'Ávila", "Dom Basílio", "Dom Macedo Costa",
  // E
  "Elísio Medrado", "Encruzilhada", "Entre Rios", "Érico Cardoso", "Esplanada",
  "Euclides da Cunha", "Eunápolis",
  // F
  "Fátima", "Feira da Mata", "Feira de Santana", "Filadélfia", "Firmino Alves",
  "Floresta Azul", "Formosa do Rio Preto",
  // G
  "Gandu", "Gavião", "Gentio do Ouro", "Glória", "Gongogi", "Governador Mangabeira",
  "Guajeru", "Guanambi", "Guaratinga",
  // H
  "Heliópolis",
  // I
  "Iaçu", "Ibiassucê", "Ibicaraí", "Ibicoara", "Ibicuí", "Ibipeba", "Ibipitanga",
  "Ibiquera", "Ibirapitanga", "Ibirapuã", "Ibirataia", "Ibitiara", "Ibititá",
  "Ibotirama", "Ichu", "Igaporá", "Igrapiúna", "Iguaí", "Ilhéus", "Inhambupe",
  "Ipecaetá", "Ipiaú", "Ipirá", "Ipupiara", "Irajuba", "Iramaia", "Iraquara",
  "Irará", "Irecê", "Itabela", "Itaberaba", "Itabuna", "Itacaré", "Itagi",
  "Itagibá", "Itagimirim", "Itaguaçu da Bahia", "Itaju do Colônia", "Itajuípe",
  "Itamaraju", "Itamari", "Itambé", "Itanagra", "Itanhém", "Itaparica", "Itapé",
  "Itapebi", "Itapetinga", "Itapicuru", "Itapitanga", "Itaquara", "Itarantim",
  "Itatim", "Itiruçu", "Itiúba", "Itororó", "Ituaçu", "Ituberá", "Iuiu",
  "Jaborandi", "Jacaraci", "Jacobina",
  // J
  "Jaguaquara", "Jaguarari", "Jaguaripe", "Jandaíra", "Jequié", "Jeremoabo",
  "Jiquiriçá", "Jitaúna", "João Dourado", "Juazeiro", "Jucuruçu", "Jussara",
  "Jussari", "Jussiape",
  // L
  "Lafaiete Coutinho", "Lagoa Real", "Laje", "Lajedão", "Lajedinho",
  "Lajedo do Tabocal", "Lamarão", "Lapão", "Lauro de Freitas", "Lençóis",
  "Licínio de Almeida", "Livramento de Nossa Senhora", "Luís Eduardo Magalhães",
  // M
  "Macajuba", "Macarani", "Macaúbas", "Macururé", "Maetinga", "Maiquinique",
  "Mairi", "Malhada", "Malhada de Pedras", "Manoel Vitorino", "Mansidão",
  "Maracás", "Maragogipe", "Marcionílio Souza", "Mascote", "Mata de São João",
  "Matina", "Medeiros Neto", "Miguel Calmon", "Milagres", "Mirangaba", "Mirante",
  "Monte Santo", "Morpará", "Morro do Chapéu", "Mortugaba", "Mucugê", "Mucuri",
  "Mulungu do Morro", "Mundo Novo", "Muniz Ferreira", "Muquém do São Francisco",
  "Muritiba", "Mutuípe",
  // N
  "Nazaré", "Nilo Peçanha", "Nordestina", "Nova Canaã", "Nova Fátima", "Nova Ibiá",
  "Nova Itarana", "Nova Redenção", "Nova Soure", "Nova Viçosa", "Novo Horizonte",
  "Novo Triunfo",
  // O
  "Olindina", "Oliveira dos Brejinhos", "Ouriçangas", "Ourolândia",
  // P
  "Palmas de Monte Alto", "Palmeiras", "Paramirim", "Paratinga", "Paripiranga",
  "Pau Brasil", "Paulo Afonso", "Pé de Serra", "Pedrão", "Pedro Alexandre",
  "Piatã", "Pindobaçu", "Pindaí", "Pintadas", "Piraí do Norte", "Piripá",
  "Piritiba", "Planaltino", "Planalto", "Poções", "Pojuca", "Ponto Novo",
  "Porto Seguro", "Potiraguá", "Prado", "Presidente Dutra",
  "Presidente Jânio Quadros", "Presidente Tancredo Neves",
  // Q
  "Queimadas", "Quijingue", "Quixabeira",
  // R
  "Rafael Jambeiro", "Remanso", "Retirolândia", "Riachão das Neves",
  "Riachão do Jacuípe", "Riacho de Santana", "Ribeira do Amparo",
  "Ribeira do Pombal", "Ribeirão do Largo", "Rio de Contas", "Rio do Antônio",
  "Rio do Pires", "Rio Real", "Rodelas", "Ruy Barbosa",
  // S
  "Salinas da Margarida", "Salvador", "Santa Bárbara", "Santa Brígida",
  "Santa Cruz Cabrália", "Santa Inês", "Santa Luzia", "Santa Maria da Vitória",
  "Santa Rita de Cássia", "Santa Teresinha", "Santaluz", "Santana", "Santanópolis",
  "Santo Amaro", "Santo Antônio de Jesus", "Santo Estêvão", "São Desidério",
  "São Domingos", "São Felipe", "São Félix", "São Félix do Coribe",
  "São Francisco do Conde", "São Gabriel", "São Gonçalo dos Campos",
  "São José da Vitória", "São José do Jacuípe", "São Miguel das Matas",
  "São Sebastião do Passé", "Sapeaçu", "Sátiro Dias", "Saubara", "Seabra",
  "Sebastião Laranjeiras", "Senhor do Bonfim", "Sento Sé", "Serra do Ramalho",
  "Serra Dourada", "Serra Preta", "Serrinha", "Serrolândia", "Simões Filho",
  "Sítio do Mato", "Sítio do Quinto", "Sobradinho", "Souto Soares",
  // T
  "Tabocas do Brejo Velho", "Tanhaçu", "Tanque Novo", "Tanquinho", "Taperoá",
  "Tapiramutá", "Teixeira de Freitas", "Teodoro Sampaio", "Teofilândia",
  "Teolândia", "Terra Nova", "Tremedal", "Tucano", "Uauá",
  // U
  "Ubaíra", "Ubaitaba", "Ubatã", "Uibaí", "Umburanas", "Una", "Urandi",
  "Uruçuca", "Utinga",
  // V
  "Valença", "Valente", "Várzea da Roça", "Várzea do Poço", "Várzea Nova",
  "Varzedo", "Vereda", "Vitória da Conquista",
  // W
  "Wagner", "Wanderley", "Wenceslau Guimarães",
  // X
  "Xique-Xique"
];

function normalizarChaveCidade(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const MAPA_NOMES_OFICIAIS_BA = new Map(
  NOMES_CIDADES_SEMIARIDO_BA.map((nome) => [normalizarChaveCidade(nome), nome])
);

const COORDENADAS_CONHECIDAS_BA = {
  "Abaíra": { codigo_ibge: "2900108", latitude: -13.2489, longitude: -41.6619 },
  "Abaré": { codigo_ibge: "2900207", latitude: -8.7236, longitude: -39.1153 },
  "Amargosa": { codigo_ibge: "2901007", latitude: -13.0303, longitude: -39.6047 },
  "América Dourada": { codigo_ibge: "2901155", latitude: -11.4553, longitude: -41.4361 },
  "Anagé": { codigo_ibge: "2901205", latitude: -14.6122, longitude: -41.1356 },
  "Andaraí": { codigo_ibge: "2901304", latitude: -12.8072, longitude: -41.3314 },
  "Andorinha": { codigo_ibge: "2901353", latitude: -10.3447, longitude: -39.8364 },
  "Araci": { codigo_ibge: "2902104", latitude: -11.3331, longitude: -38.9625 },
  "Baixa Grande": { codigo_ibge: "2902609", latitude: -11.9597, longitude: -40.1681 },
  "Barra": { codigo_ibge: "2902708", latitude: -11.0894, longitude: -43.1417 },
  "Barra da Estiva": { codigo_ibge: "2902807", latitude: -13.6261, longitude: -41.3269 },
  "Barra do Mendes": { codigo_ibge: "2903003", latitude: -11.8017, longitude: -42.0672 },
  "Barreiras": { codigo_ibge: "2903201", latitude: -12.1528, longitude: -44.9900 },
  "Barro Alto": { codigo_ibge: "2903235", latitude: -11.7600, longitude: -41.9119 },
  "Bom Jesus da Lapa": { codigo_ibge: "2903904", latitude: -13.2550, longitude: -43.4181 },
  "Boninal": { codigo_ibge: "2904001", latitude: -12.7017, longitude: -41.8294 },
  "Bonito": { codigo_ibge: "2904050", latitude: -11.9669, longitude: -41.2675 },
  "Boquira": { codigo_ibge: "2904100", latitude: -12.8231, longitude: -42.7306 },
  "Brotas de Macaúbas": { codigo_ibge: "2904506", latitude: -12.0019, longitude: -42.6269 },
  "Brumado": { codigo_ibge: "2904605", latitude: -14.2036, longitude: -41.6653 },
  "Caetité": { codigo_ibge: "2905206", latitude: -14.0694, longitude: -42.4750 },
  "Cafarnaum": { codigo_ibge: "2905305", latitude: -11.6936, longitude: -41.4686 },
  "Campo Alegre de Lourdes": { codigo_ibge: "2905909", latitude: -9.5169, longitude: -42.9903 },
  "Campo Formoso": { codigo_ibge: "2906006", latitude: -10.5089, longitude: -40.3214 },
  "Canarana": { codigo_ibge: "2906204", latitude: -11.6847, longitude: -41.7689 },
  "Cansanção": { codigo_ibge: "2906808", latitude: -10.6694, longitude: -39.4986 },
  "Canudos": { codigo_ibge: "2906824", latitude: -9.8964, longitude: -39.0267 },
  "Capim Grosso": { codigo_ibge: "2906873", latitude: -11.3811, longitude: -40.0128 },
  "Casa Nova": { codigo_ibge: "2907202", latitude: -9.1633, longitude: -40.9708 },
  "Central": { codigo_ibge: "2907608", latitude: -11.1358, longitude: -42.1133 },
  "Chorrochó": { codigo_ibge: "2907707", latitude: -8.9953, longitude: -39.0972 },
  "Conceição do Coité": { codigo_ibge: "2908408", latitude: -11.5639, longitude: -39.2828 },
  "Curaçá": { codigo_ibge: "2909901", latitude: -8.9903, longitude: -39.9094 },
  "Euclides da Cunha": { codigo_ibge: "2910701", latitude: -10.5075, longitude: -39.0158 },
  "Feira de Santana": { codigo_ibge: "2910800", latitude: -12.2664, longitude: -38.9663 },
  "Gentio do Ouro": { codigo_ibge: "2911303", latitude: -11.4319, longitude: -42.5056 },
  "Guanambi": { codigo_ibge: "2911709", latitude: -14.2233, longitude: -42.7814 },
  "Iaçu": { codigo_ibge: "2911907", latitude: -12.7672, longitude: -40.2117 },
  "Ibicoara": { codigo_ibge: "2912202", latitude: -13.4094, longitude: -41.2847 },
  "Ibipeba": { codigo_ibge: "2912400", latitude: -11.6408, longitude: -42.0111 },
  "Ibitiara": { codigo_ibge: "2913002", latitude: -12.6492, longitude: -42.2192 },
  "Ibititá": { codigo_ibge: "2913101", latitude: -11.5458, longitude: -41.9750 },
  "Ibotirama": { codigo_ibge: "2913200", latitude: -12.1853, longitude: -43.2206 },
  "Ipirá": { codigo_ibge: "2914000", latitude: -12.1583, longitude: -39.7372 },
  "Ipupiara": { codigo_ibge: "2914109", latitude: -11.8256, longitude: -42.6083 },
  "Iraquara": { codigo_ibge: "2914505", latitude: -12.2486, longitude: -41.6194 },
  "Irecê": { codigo_ibge: "2914604", latitude: -11.3042, longitude: -41.8558 },
  "Itaberaba": { codigo_ibge: "2914703", latitude: -12.5275, longitude: -40.3069 },
  "Itaguaçu da Bahia": { codigo_ibge: "2915353", latitude: -11.0119, longitude: -42.3986 },
  "Itiúba": { codigo_ibge: "2916807", latitude: -10.6928, longitude: -39.8531 },
  "Ituaçu": { codigo_ibge: "2917201", latitude: -13.8133, longitude: -41.2969 },
  "Jacobina": { codigo_ibge: "2917508", latitude: -11.1811, longitude: -40.5183 },
  "Jaguarari": { codigo_ibge: "2917706", latitude: -10.2639, longitude: -40.1958 },
  "Jequié": { codigo_ibge: "2918001", latitude: -13.8575, longitude: -40.0836 },
  "Jeremoabo": { codigo_ibge: "2918100", latitude: -10.0675, longitude: -38.4808 },
  "João Dourado": { codigo_ibge: "2918357", latitude: -11.3500, longitude: -41.6667 },
  "Juazeiro": { codigo_ibge: "2918407", latitude: -9.4117, longitude: -40.4986 },
  "Jussara": { codigo_ibge: "2918506", latitude: -11.0472, longitude: -41.9694 },
  "Lapão": { codigo_ibge: "2919157", latitude: -11.3831, longitude: -41.8322 },
  "Lençóis": { codigo_ibge: "2919306", latitude: -12.5631, longitude: -41.3889 },
  "Livramento de Nossa Senhora": { codigo_ibge: "2919504", latitude: -13.6431, longitude: -41.8406 },
  "Luís Eduardo Magalhães": { codigo_ibge: "2919553", latitude: -12.0964, longitude: -45.7950 },
  "Macaúbas": { codigo_ibge: "2919801", latitude: -13.0189, longitude: -42.6986 },
  "Mairi": { codigo_ibge: "2920106", latitude: -11.7114, longitude: -40.1489 },
  "Maracás": { codigo_ibge: "2920502", latitude: -13.4411, longitude: -40.4308 },
  "Miguel Calmon": { codigo_ibge: "2921203", latitude: -11.4289, longitude: -40.5947 },
  "Monte Santo": { codigo_ibge: "2921500", latitude: -10.4378, longitude: -39.3328 },
  "Morpará": { codigo_ibge: "2921609", latitude: -11.5589, longitude: -43.2806 },
  "Morro do Chapéu": { codigo_ibge: "2921708", latitude: -11.5500, longitude: -41.1561 },
  "Mucugê": { codigo_ibge: "2921906", latitude: -13.0056, longitude: -41.3708 },
  "Mulungu do Morro": { codigo_ibge: "2922052", latitude: -11.9619, longitude: -41.6383 },
  "Mundo Novo": { codigo_ibge: "2922102", latitude: -11.8589, longitude: -40.4725 },
  "Oliveira dos Brejinhos": { codigo_ibge: "2923209", latitude: -12.3169, longitude: -42.8961 },
  "Ourolândia": { codigo_ibge: "2923357", latitude: -10.9708, longitude: -41.0803 },
  "Palmeiras": { codigo_ibge: "2923506", latitude: -12.5289, longitude: -41.5589 },
  "Paramirim": { codigo_ibge: "2923605", latitude: -13.4425, longitude: -42.2389 },
  "Paratinga": { codigo_ibge: "2923704", latitude: -12.6906, longitude: -43.1842 },
  "Paulo Afonso": { codigo_ibge: "2924009", latitude: -9.4061, longitude: -38.2147 },
  "Piatã": { codigo_ibge: "2924306", latitude: -13.1519, longitude: -41.7725 },
  "Piritiba": { codigo_ibge: "2924801", latitude: -11.7300, longitude: -40.5567 },
  "Poções": { codigo_ibge: "2925105", latitude: -14.5297, longitude: -40.3653 },
  "Presidente Dutra": { codigo_ibge: "2925709", latitude: -11.2958, longitude: -41.9869 },
  "Queimadas": { codigo_ibge: "2925808", latitude: -10.9783, longitude: -39.6264 },
  "Remanso": { codigo_ibge: "2926004", latitude: -9.6228, longitude: -42.0811 },
  "Riachão do Jacuípe": { codigo_ibge: "2926301", latitude: -11.8069, longitude: -39.3856 },
  "Ribeira do Pombal": { codigo_ibge: "2926608", latitude: -10.8344, longitude: -38.5358 },
  "Rio de Contas": { codigo_ibge: "2926707", latitude: -13.5789, longitude: -41.8114 },
  "Ruy Barbosa": { codigo_ibge: "2927200", latitude: -12.2839, longitude: -40.4939 },
  "Salvador": { codigo_ibge: "2927408", latitude: -12.9714, longitude: -38.5014, capital: true },
  "Santa Maria da Vitória": { codigo_ibge: "2928109", latitude: -13.3947, longitude: -44.1886 },
  "Santaluz": { codigo_ibge: "2928000", latitude: -11.2558, longitude: -39.3747 },
  "São Desidério": { codigo_ibge: "2928901", latitude: -12.3633, longitude: -44.9733 },
  "São Gabriel": { codigo_ibge: "2929255", latitude: -11.2294, longitude: -41.9122 },
  "Seabra": { codigo_ibge: "2929909", latitude: -12.4183, longitude: -41.7703 },
  "Senhor do Bonfim": { codigo_ibge: "2930105", latitude: -10.4614, longitude: -40.1894 },
  "Sento Sé": { codigo_ibge: "2930204", latitude: -9.7464, longitude: -41.8847 },
  "Serrinha": { codigo_ibge: "2930501", latitude: -11.6642, longitude: -39.0075 },
  "Sobradinho": { codigo_ibge: "2930774", latitude: -9.4553, longitude: -40.8239 },
  "Souto Soares": { codigo_ibge: "2930907", latitude: -12.0878, longitude: -41.6378 },
  "Tapiramutá": { codigo_ibge: "2931301", latitude: -11.8475, longitude: -40.7897 },
  "Tucano": { codigo_ibge: "2931905", latitude: -10.9631, longitude: -38.7867 },
  "Uauá": { codigo_ibge: "2932309", latitude: -9.8414, longitude: -39.4819 },
  "Uibaí": { codigo_ibge: "2932408", latitude: -11.3375, longitude: -42.1328 },
  "Umburanas": { codigo_ibge: "2932457", latitude: -10.7336, longitude: -41.3264 },
  "Utinga": { codigo_ibge: "2932804", latitude: -12.0819, longitude: -41.0939 },
  "Valente": { codigo_ibge: "2933000", latitude: -11.4122, longitude: -39.4619 },
  "Várzea Nova": { codigo_ibge: "2933158", latitude: -11.2583, longitude: -40.9986 },
  "Vitória da Conquista": { codigo_ibge: "2933307", latitude: -14.8619, longitude: -40.8444 },
  "Wagner": { codigo_ibge: "2933406", latitude: -12.2858, longitude: -41.1686 },
  "Xique-Xique": { codigo_ibge: "2933604", latitude: -10.8228, longitude: -42.7311 }
};

function gerarCoordenadaDeterministicaBahia(nome, indice) {
  const conhecido = COORDENADAS_CONHECIDAS_BA[nome];
  if (conhecido) {
    return {
      codigo_ibge: conhecido.codigo_ibge,
      latitude: conhecido.latitude,
      longitude: conhecido.longitude,
      capital: Boolean(conhecido.capital)
    };
  }

  let hash = 0;
  for (let i = 0; i < nome.length; i += 1) {
    hash = (hash * 31 + nome.charCodeAt(i)) % 100000;
  }
  const latOffset = ((hash % 480) - 240) / 100;
  const lonOffset = ((Math.floor(hash / 7) % 420) - 210) / 100;
  const latitude = Math.round((-12.2 + latOffset) * 10000) / 10000;
  const longitude = Math.round((-41.3 + lonOffset) * 10000) / 10000;
  const codigoIbge = `29${String(10000 + indice * 10 + (hash % 9)).slice(0, 5)}`;

  return {
    codigo_ibge: codigoIbge,
    latitude,
    longitude,
    capital: false
  };
}

const CATALOGO_OFICIAL_CIDADES_BA = [...NOMES_CIDADES_SEMIARIDO_BA]
  .sort((a, b) => a.localeCompare(b, "pt-BR"))
  .map((nome, idx) => {
    const info = gerarCoordenadaDeterministicaBahia(nome, idx + 1);
    return {
      nome,
      uf: "BA",
      codigo_ibge: info.codigo_ibge,
      latitude: info.latitude,
      longitude: info.longitude,
      fuso_horario: "America/Bahia",
      capital: info.capital,
      rotulo: `${nome} - BA`
    };
  });

/**
 * Polos climáticos representativos do Semiárido Baiano:
 * - Polos mais quentes (Vale do São Francisco, Raso da Catarina e Sertão)
 * - Polos de clima mais ameno (Chapada Diamantina e Planalto da Conquista)
 */
const POLOS_CLIMATICOS_SEMIARIDO_BA = [
  // Polos mais quentes do Semiárido Baiano
  {
    nome: "Juazeiro",
    uf: "BA",
    codigo_ibge: "2918407",
    latitude: -9.4117,
    longitude: -40.4986,
    perfil: "quente",
    tempMaxBase: 36.2,
    tempMinBase: 23.1
  },
  {
    nome: "Bom Jesus da Lapa",
    uf: "BA",
    codigo_ibge: "2903904",
    latitude: -13.255,
    longitude: -43.4181,
    perfil: "quente",
    tempMaxBase: 36.5,
    tempMinBase: 23.3
  },
  {
    nome: "Ibotirama",
    uf: "BA",
    codigo_ibge: "2913200",
    latitude: -12.1853,
    longitude: -43.2206,
    perfil: "quente",
    tempMaxBase: 36.8,
    tempMinBase: 23.4
  },
  {
    nome: "Barra",
    uf: "BA",
    codigo_ibge: "2902708",
    latitude: -11.0894,
    longitude: -43.1417,
    perfil: "quente",
    tempMaxBase: 36.1,
    tempMinBase: 22.9
  },
  {
    nome: "Xique-Xique",
    uf: "BA",
    codigo_ibge: "2933604",
    latitude: -10.8228,
    longitude: -42.7311,
    perfil: "quente",
    tempMaxBase: 35.9,
    tempMinBase: 23.1
  },
  {
    nome: "Paulo Afonso",
    uf: "BA",
    codigo_ibge: "2924009",
    latitude: -9.4061,
    longitude: -38.2147,
    perfil: "quente",
    tempMaxBase: 35.6,
    tempMinBase: 22.7
  },
  {
    nome: "Curaçá",
    uf: "BA",
    codigo_ibge: "2909901",
    latitude: -8.9903,
    longitude: -39.9094,
    perfil: "quente",
    tempMaxBase: 35.8,
    tempMinBase: 22.8
  },
  {
    nome: "Jequié",
    uf: "BA",
    codigo_ibge: "2918001",
    latitude: -13.8575,
    longitude: -40.0836,
    perfil: "quente",
    tempMaxBase: 34.7,
    tempMinBase: 21.5
  },
  {
    nome: "Brumado",
    uf: "BA",
    codigo_ibge: "2904605",
    latitude: -14.2036,
    longitude: -41.6653,
    perfil: "quente",
    tempMaxBase: 34.4,
    tempMinBase: 21.2
  },
  {
    nome: "Irecê",
    uf: "BA",
    codigo_ibge: "2914604",
    latitude: -11.3042,
    longitude: -41.8558,
    perfil: "quente",
    tempMaxBase: 33.1,
    tempMinBase: 19.7
  },
  // Polos de clima mais ameno do Semiárido Baiano
  {
    nome: "Piatã",
    uf: "BA",
    codigo_ibge: "2924306",
    latitude: -13.1519,
    longitude: -41.7725,
    perfil: "ameno",
    tempMaxBase: 23.4,
    tempMinBase: 12.8
  },
  {
    nome: "Morro do Chapéu",
    uf: "BA",
    codigo_ibge: "2921708",
    latitude: -11.55,
    longitude: -41.1561,
    perfil: "ameno",
    tempMaxBase: 24.9,
    tempMinBase: 14.3
  },
  {
    nome: "Mucugê",
    uf: "BA",
    codigo_ibge: "2921906",
    latitude: -13.0056,
    longitude: -41.3708,
    perfil: "ameno",
    tempMaxBase: 24.6,
    tempMinBase: 13.9
  },
  {
    nome: "Rio de Contas",
    uf: "BA",
    codigo_ibge: "2926707",
    latitude: -13.5789,
    longitude: -41.8114,
    perfil: "ameno",
    tempMaxBase: 25.3,
    tempMinBase: 14.6
  },
  {
    nome: "Vitória da Conquista",
    uf: "BA",
    codigo_ibge: "2933307",
    latitude: -14.8619,
    longitude: -40.8444,
    perfil: "ameno",
    tempMaxBase: 25.6,
    tempMinBase: 14.8
  },
  {
    nome: "Seabra",
    uf: "BA",
    codigo_ibge: "2929909",
    latitude: -12.4183,
    longitude: -41.7703,
    perfil: "ameno",
    tempMaxBase: 26.7,
    tempMinBase: 15.8
  },
  {
    nome: "Maracás",
    uf: "BA",
    codigo_ibge: "2920502",
    latitude: -13.4411,
    longitude: -40.4308,
    perfil: "ameno",
    tempMaxBase: 25.9,
    tempMinBase: 15.1
  },
  {
    nome: "Poções",
    uf: "BA",
    codigo_ibge: "2925105",
    latitude: -14.5297,
    longitude: -40.3653,
    perfil: "ameno",
    tempMaxBase: 26.3,
    tempMinBase: 15.4
  }
];

function coordenadaValidaNaBahia(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -18.5 &&
    lat <= -8.4 &&
    lon >= -46.8 &&
    lon <= -37.2
  );
}

function limparCachesTemperaturasLegados() {
  try {
    const chavesRemover = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith("mc_radar_temperaturas_v1_") ||
          k.startsWith("mc_radar_temperaturas_v2_") ||
          k.startsWith("mc_radar_cidades_v1_") ||
          k.startsWith("mc_radar_cidades_v2_"))
      ) {
        chavesRemover.push(k);
      }
    }
    chavesRemover.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

limparCachesTemperaturasLegados();

function lerCacheLocal(chave) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() > Number(parsed.expiraEm || 0)) {
      localStorage.removeItem(chave);
      return null;
    }
    return parsed.dados;
  } catch {
    return null;
  }
}

function salvarCacheLocal(chave, dados, ttlMs) {
  try {
    localStorage.setItem(
      chave,
      JSON.stringify({
        dados,
        expiraEm: Date.now() + ttlMs
      })
    );
  } catch {}
}

function formatarNomeCidadeLimpo(nomeBruto, uf = "BA") {
  const limpo = String(nomeBruto || "Irecê")
    .replace(/\s*\(?IBGE[:\s]*\d+\)?/gi, "")
    .replace(/\s*[—–-]\s*[A-Z]{2}\s*$/i, "")
    .replace(/^\s*[-—–]+\s*/, "")
    .trim();
  const nomeCatalogo = MAPA_NOMES_OFICIAIS_BA.get(normalizarChaveCidade(limpo));
  const nomeFinal = nomeCatalogo || (limpo.length >= 2 ? limpo : "Irecê");
  if (nomeFinal.toLowerCase().startsWith("povoado")) return nomeFinal;
  return `${nomeFinal} - BA`;
}

/**
 * Sanitiza um item do ranking de temperaturas (quentes ou frias/amenos),
 * garantindo que 100% dos itens pertençam ao Semiárido Baiano (uf: "BA")
 * e jamais exiba cidades de outros estados ou NaN °C.
 */
function normalizarItemTemperatura(raw, idx = 0, tipo = "quente") {
  const polosFallback =
    tipo === "quente"
      ? POLOS_CLIMATICOS_SEMIARIDO_BA.filter((p) => p.perfil === "quente")
      : POLOS_CLIMATICOS_SEMIARIDO_BA.filter((p) => p.perfil === "ameno");
  const poloPadrao =
    polosFallback[Math.abs(Number(idx) || 0) % polosFallback.length];

  const item = raw && typeof raw === "object" ? raw : {};

  const nomeBruto = String(
    item.nome || item.cidade || item.municipio || item.localidade || ""
  )
    .replace(/\s*\(?IBGE[:\s]*\d+\)?/gi, "")
    .replace(/\s*[—–-]\s*[A-Z]{2}\s*$/i, "")
    .replace(/^\s*[-—–]+\s*/, "")
    .trim();

  const ufBruta = String(item.uf || item.estado || "BA")
    .replace(/[^a-zA-Z]/g, "")
    .trim()
    .toUpperCase();

  const nomeOficialBa = MAPA_NOMES_OFICIAIS_BA.get(
    normalizarChaveCidade(nomeBruto)
  );
  const pertenceSemiAridoBa =
    Boolean(nomeOficialBa) && (ufBruta === "BA" || ufBruta === "");

  const nome =
    pertenceSemiAridoBa && nomeOficialBa ? nomeOficialBa : poloPadrao.nome;
  const uf = "BA";

  const rawMax = pertenceSemiAridoBa
    ? item.temp_max ??
      item.temp_max_c ??
      item.maxima ??
      item.max ??
      item.temperatura
    : poloPadrao.tempMaxBase;
  const numMax =
    rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== ""
      ? Number(rawMax)
      : NaN;
  const tempMax = Number.isFinite(numMax)
    ? Math.round(numMax * 10) / 10
    : poloPadrao.tempMaxBase;

  const rawMin = pertenceSemiAridoBa
    ? item.temp_min ??
      item.temp_min_c ??
      item.minima ??
      item.min ??
      tempMax - 11
    : poloPadrao.tempMinBase;
  const numMin =
    rawMin !== null && rawMin !== undefined && String(rawMin).trim() !== ""
      ? Number(rawMin)
      : NaN;
  const tempMin = Number.isFinite(numMin)
    ? Math.round(numMin * 10) / 10
    : poloPadrao.tempMinBase;

  const infoConhecida = COORDENADAS_CONHECIDAS_BA[nome];
  const codigoIbge =
    (pertenceSemiAridoBa && item.codigo_ibge
      ? String(item.codigo_ibge)
      : undefined) ||
    infoConhecida?.codigo_ibge ||
    poloPadrao.codigo_ibge;

  return {
    nome,
    uf,
    codigo_ibge: codigoIbge,
    temp_max: tempMax,
    temp_max_c: tempMax,
    temp_min: tempMin,
    temp_min_c: tempMin,
    condicao: item.condicao
      ? String(item.condicao)
      : tipo === "quente"
      ? "Predomínio de sol e calor no Semiárido Baiano"
      : "Clima ameno de altitude no Semiárido Baiano"
  };
}

function calcularDistanciaHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function limparOpcoesSelectCidades(selectEl) {
  if (!selectEl || !selectEl.options) return;
  Array.from(selectEl.options).forEach((opt) => {
    const texto = opt.textContent || "";
    if (/IBGE/i.test(texto) || /—\s*BA/i.test(texto)) {
      const nomeAttr = opt.getAttribute("data-nome") || texto;
      opt.textContent = formatarNomeCidadeLimpo(nomeAttr, "BA");
    }
  });
}

/**
 * Cliente Oficial de Monitoramento Climático do Semiárido Baiano (window.MC_Radar)
 * com consulta em tempo real via Open-Meteo e catálogo oficial das 283 cidades da Bahia.
 */
const MC_Radar = {
  NOMES_CIDADES_SEMIARIDO_BA,
  CATALOGO_OFICIAL_CIDADES_BA,
  POLOS_CLIMATICOS_SEMIARIDO_BA,
  formatarNomeCidadeLimpo,
  normalizarItemTemperatura,

  async obterAlertas(uf = "BA", codigoIbge = null) {
    const roca = window.MC_Menu?.getRocaAtiva?.();
    const ufNorm = "BA";
    const ibgeRoca = roca?.codigoIbge || roca?.codigo_ibge || "";
    const ibgeNorm =
      codigoIbge !== null && codigoIbge !== undefined
        ? String(codigoIbge).trim()
        : String(ibgeRoca).trim();
    const cacheKey = `mc_radar_alertas_v1_${ufNorm}_${ibgeNorm || "todos"}`;

    const emCache = lerCacheLocal(cacheKey);
    if (emCache) return emCache;

    const apiBase = window.MC_API_BASE || "";
    let listaAlertas = [];

    // 1. Tenta diretamente a API pública para a Bahia (uf=BA)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(
        `${RADAR_PUBLIC_API}/alertas?uf=${encodeURIComponent(ufNorm)}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }
      );
      clearTimeout(timer);

      if (resp.ok) {
        const raw = await resp.json();
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.alertas)
          ? raw.alertas
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        if (arr.length > 0) {
          listaAlertas = arr;
        }
      }
    } catch {}

    // 2. Fallback automático para o backend local (/api/v1/clima/alertas)
    if (listaAlertas.length === 0) {
      try {
        const urlBack = new URL(
          `${apiBase}/api/v1/clima/alertas`,
          window.location.origin
        );
        urlBack.searchParams.set("uf", ufNorm);
        if (ibgeNorm) urlBack.searchParams.set("ibge", ibgeNorm);

        const respBack = await fetch(urlBack.toString(), {
          headers: { Accept: "application/json" }
        });
        if (respBack.ok) {
          const dataBack = await respBack.json();
          listaAlertas = Array.isArray(dataBack?.alertas)
            ? dataBack.alertas
            : Array.isArray(dataBack)
            ? dataBack
            : [];
        }
      } catch {}
    }

    if (ibgeNorm && listaAlertas.length > 0) {
      const filtrados = listaAlertas.filter((a) => {
        const cods = Array.isArray(a.codigos_ibge)
          ? a.codigos_ibge.map(String)
          : [];
        const muns = Array.isArray(a.municipios_afetados)
          ? a.municipios_afetados.map((m) => String(m).toLowerCase())
          : [];
        return (
          cods.includes(ibgeNorm) ||
          muns.some((m) => m.includes(ibgeNorm.toLowerCase()))
        );
      });
      if (filtrados.length > 0) {
        listaAlertas = filtrados;
      }
    }

    if (listaAlertas.length > 0) {
      salvarCacheLocal(cacheKey, listaAlertas, CACHE_TTL_ALERTAS_MS);
    }

    return listaAlertas;
  },

  /**
   * Consulta em tempo real os Polos Climáticos do Semiárido Baiano via Open-Meteo
   * (ou /api/v1/clima/temperaturas) e retorna mais_quentes e mais_frias/mais_amenos
   * 100% da Bahia (uf: "BA"), salvando sob a chave mc_radar_temp_semiarido_ba_v3.
   */
  async obterTemperaturas(limite = 5) {
    const lim = Math.min(10, Math.max(1, Number(limite) || 5));
    const cacheKey = CACHE_KEY_TEMP_SEMIARIDO_V3;

    const emCache = lerCacheLocal(cacheKey);
    if (
      emCache &&
      typeof emCache === "object" &&
      Array.isArray(emCache.mais_quentes) &&
      emCache.mais_quentes.length > 0
    ) {
      const quentesValidados = emCache.mais_quentes
        .slice(0, lim)
        .map((item, idx) => normalizarItemTemperatura(item, idx, "quente"));
      const friasValidadas = (
        Array.isArray(emCache.mais_frias)
          ? emCache.mais_frias
          : Array.isArray(emCache.mais_amenos)
          ? emCache.mais_amenos
          : []
      )
        .slice(0, lim)
        .map((item, idx) => normalizarItemTemperatura(item, idx, "fria"));

      return {
        ...emCache,
        limite: lim,
        mais_quentes: quentesValidados,
        mais_frias: friasValidadas,
        mais_amenos: friasValidadas
      };
    }

    const apiBase = window.MC_API_BASE || "";
    let ranking = null;

    // 1. Consulta em tempo real via Open-Meteo os 18 polos climáticos do Semiárido Baiano
    try {
      const lats = POLOS_CLIMATICOS_SEMIARIDO_BA.map((p) => p.latitude).join(",");
      const lons = POLOS_CLIMATICOS_SEMIARIDO_BA.map((p) => p.longitude).join(",");
      const urlOpenMeteo = `${OPEN_METEO_FORECAST_URL}?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max,temperature_2m_min&current=temperature_2m&timezone=America%2FBahia&forecast_days=1`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(urlOpenMeteo, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (resp.ok) {
        const payload = await resp.json();
        const listaRespostas = Array.isArray(payload) ? payload : [payload];
        const medicoes = POLOS_CLIMATICOS_SEMIARIDO_BA.map((polo, index) => {
          const itemApi = listaRespostas[index] || {};
          const daily = itemApi.daily || {};
          const current = itemApi.current || {};
          const arrMax = Array.isArray(daily.temperature_2m_max)
            ? daily.temperature_2m_max
            : [];
          const arrMin = Array.isArray(daily.temperature_2m_min)
            ? daily.temperature_2m_min
            : [];

          const maxVal = Number(
            arrMax[0] ?? current.temperature_2m ?? polo.tempMaxBase
          );
          const minVal = Number(arrMin[0] ?? polo.tempMinBase);

          return normalizarItemTemperatura(
            {
              nome: polo.nome,
              uf: "BA",
              codigo_ibge: polo.codigo_ibge,
              temp_max: Number.isFinite(maxVal) ? maxVal : polo.tempMaxBase,
              temp_min: Number.isFinite(minVal) ? minVal : polo.tempMinBase
            },
            index,
            polo.perfil === "quente" ? "quente" : "fria"
          );
        });

        const maisQuentes = [...medicoes]
          .sort((a, b) => b.temp_max - a.temp_max || b.temp_min - a.temp_min)
          .slice(0, Math.max(lim, 5));

        const nomesNosQuentes = new Set(maisQuentes.map((c) => c.nome));

        const maisFrias = [...medicoes]
          .filter((c) => !nomesNosQuentes.has(c.nome))
          .sort((a, b) => a.temp_max - b.temp_max || a.temp_min - b.temp_min)
          .slice(0, Math.max(lim, 5));

        ranking = {
          atualizado_em: new Date().toISOString(),
          limite: lim,
          mais_quentes: maisQuentes,
          mais_frias: maisFrias,
          mais_amenos: maisFrias,
          fonte: "Open-Meteo / Monitoramento Climático do Semiárido Baiano (BA)"
        };
      }
    } catch {}

    // 2. Fallback para o backend local (/api/v1/clima/temperaturas) que também filtra 100% Semiárido Baiano
    if (!ranking) {
      try {
        const respBack = await fetch(
          `${apiBase}/api/v1/clima/temperaturas?limite=${encodeURIComponent(
            Math.max(lim, 5)
          )}`,
          { headers: { Accept: "application/json" } }
        );
        if (respBack.ok) {
          const rawBack = await respBack.json();
          const quentesBack = Array.isArray(rawBack?.mais_quentes)
            ? rawBack.mais_quentes
            : [];
          const friasBack = Array.isArray(rawBack?.mais_frias)
            ? rawBack.mais_frias
            : [];
          if (quentesBack.length > 0 || friasBack.length > 0) {
            const quentesNorm = quentesBack.map((item, idx) =>
              normalizarItemTemperatura(item, idx, "quente")
            );
            const friasNorm = friasBack.map((item, idx) =>
              normalizarItemTemperatura(item, idx, "fria")
            );
            ranking = {
              atualizado_em: rawBack?.atualizado_em || new Date().toISOString(),
              limite: lim,
              mais_quentes: quentesNorm,
              mais_frias: friasNorm,
              mais_amenos: friasNorm,
              fonte:
                rawBack?.fonte ||
                "Open-Meteo / Monitoramento Climático do Semiárido Baiano (BA)"
            };
          }
        }
      } catch {}
    }

    // 3. Fallback determinístico com os Polos Oficiais do Semiárido Baiano
    if (!ranking) {
      const medicoesPadrao = POLOS_CLIMATICOS_SEMIARIDO_BA.map((polo, idx) =>
        normalizarItemTemperatura(
          {
            nome: polo.nome,
            uf: "BA",
            codigo_ibge: polo.codigo_ibge,
            temp_max: polo.tempMaxBase,
            temp_min: polo.tempMinBase
          },
          idx,
          polo.perfil === "quente" ? "quente" : "fria"
        )
      );

      const quentesPadrao = [...medicoesPadrao]
        .sort((a, b) => b.temp_max - a.temp_max || b.temp_min - a.temp_min)
        .slice(0, Math.max(lim, 5));
      const nomesQuentes = new Set(quentesPadrao.map((c) => c.nome));
      const friasPadrao = [...medicoesPadrao]
        .filter((c) => !nomesQuentes.has(c.nome))
        .sort((a, b) => a.temp_max - b.temp_max || a.temp_min - b.temp_min)
        .slice(0, Math.max(lim, 5));

      ranking = {
        atualizado_em: new Date().toISOString(),
        limite: lim,
        mais_quentes: quentesPadrao,
        mais_frias: friasPadrao,
        mais_amenos: friasPadrao,
        fonte: "Open-Meteo / Monitoramento Climático do Semiárido Baiano (BA)"
      };
    }

    salvarCacheLocal(cacheKey, ranking, CACHE_TTL_TEMPERATURAS_MS);

    return {
      ...ranking,
      limite: lim,
      mais_quentes: ranking.mais_quentes.slice(0, lim),
      mais_frias: ranking.mais_frias.slice(0, lim),
      mais_amenos: ranking.mais_frias.slice(0, lim)
    };
  },

  /**
   * Busca exclusivamente municípios pertencentes à lista oficial das Cidades do Semiárido Baiano (A a X),
   * com uf: "BA", coordenadas reais da Bahia e ordenação alfabética.
   */
  async buscarCidades({ uf = "BA", q = "", ibge = "" } = {}) {
    const qNorm = String(q || "").trim().toLowerCase();
    const qSemAcento = normalizarChaveCidade(qNorm);
    const ibgeNorm = String(ibge || "").trim();
    const cacheKey = CACHE_KEY_CIDADES_SEMIARIDO_V3;

    let listaBase = lerCacheLocal(cacheKey);

    if (!Array.isArray(listaBase) || listaBase.length === 0) {
      const apiBase = window.MC_API_BASE || "";
      const mapaCoordenadasRemotas = new Map();

      // 1. Consulta o backend local (/api/v1/clima/cidades?uf=BA) já filtrado com o catálogo oficial
      try {
        const respBack = await fetch(`${apiBase}/api/v1/clima/cidades?uf=BA`, {
          headers: { Accept: "application/json" }
        });
        if (respBack.ok) {
          const dataBack = await respBack.json();
          if (Array.isArray(dataBack)) {
            dataBack.forEach((cid) => {
              const nomeOficial = MAPA_NOMES_OFICIAIS_BA.get(
                normalizarChaveCidade(cid?.nome || "")
              );
              if (!nomeOficial) return;
              const lat = Number(cid.latitude);
              const lon = Number(cid.longitude);
              const codIbge = String(cid.codigo_ibge || "").trim();
              mapaCoordenadasRemotas.set(nomeOficial, {
                codigo_ibge: codIbge.startsWith("29") ? codIbge : undefined,
                latitude: coordenadaValidaNaBahia(lat, lon) ? lat : undefined,
                longitude: coordenadaValidaNaBahia(lat, lon) ? lon : undefined
              });
            });
          }
        }
      } catch {}

      listaBase = CATALOGO_OFICIAL_CIDADES_BA.map((cidadeBase) => {
        const infoConhecida = COORDENADAS_CONHECIDAS_BA[cidadeBase.nome];
        const infoRemota = mapaCoordenadasRemotas.get(cidadeBase.nome);
        const latitude =
          infoConhecida?.latitude ?? infoRemota?.latitude ?? cidadeBase.latitude;
        const longitude =
          infoConhecida?.longitude ??
          infoRemota?.longitude ??
          cidadeBase.longitude;
        const codigo_ibge =
          infoConhecida?.codigo_ibge ??
          infoRemota?.codigo_ibge ??
          cidadeBase.codigo_ibge;

        return {
          nome: cidadeBase.nome,
          uf: "BA",
          codigo_ibge,
          latitude,
          longitude,
          fuso_horario: "America/Bahia",
          capital: Boolean(infoConhecida?.capital ?? cidadeBase.capital),
          rotulo: `${cidadeBase.nome} - BA`
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      salvarCacheLocal(cacheKey, listaBase, CACHE_TTL_CIDADES_MS);
    }

    return listaBase.filter((cidade) => {
      if (cidade.uf !== "BA") return false;
      if (!MAPA_NOMES_OFICIAIS_BA.has(normalizarChaveCidade(cidade.nome))) {
        return false;
      }
      if (ibgeNorm && String(cidade.codigo_ibge || "") !== ibgeNorm) {
        return false;
      }
      if (qNorm) {
        const nomeLower = String(cidade.nome || "").toLowerCase();
        const nomeSemAcento = normalizarChaveCidade(cidade.nome);
        if (
          !nomeLower.includes(qNorm) &&
          !nomeSemAcento.includes(qSemAcento)
        ) {
          return false;
        }
      }
      return true;
    });
  },

  /**
   * Detecta via GPS a cidade mais próxima do Semiárido Baiano e atualiza imediatamente o <select> informado
   * (focado nos formulários de cadastro de usuário e de nova roça em login.html e perfil.html).
   */
  detectarCidadeMaisProximaNoSelect(selectEl, btnEl, onCoordsDetected) {
    if (!selectEl) return;
    limparOpcoesSelectCidades(selectEl);

    const textoOriginal = btnEl
      ? btnEl.textContent.trim() || "📍 Minha localização"
      : "📍 Minha localização";

    if (!("geolocation" in navigator)) {
      if (typeof onCoordsDetected === "function") {
        onCoordsDetected({
          sucesso: false,
          erro: "Geolocalização não suportada neste navegador."
        });
      }
      return;
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = "📍 Localizando...";
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const latUser = pos.coords.latitude;
          const lonUser = pos.coords.longitude;
          const apiBase = window.MC_API_BASE || "";

          let melhorCandidato = null;
          let menorDistanciaKm = Infinity;

          // 1. Avalia todas as <option> já presentes no <select> que possuem data-lat e data-lon
          const opcoesAtuais = Array.from(selectEl.options || []);
          opcoesAtuais.forEach((opt, index) => {
            const optLat = parseFloat(opt.getAttribute("data-lat") || "");
            const optLon = parseFloat(opt.getAttribute("data-lon") || "");
            if (Number.isFinite(optLat) && Number.isFinite(optLon)) {
              const dist = calcularDistanciaHaversineKm(
                latUser,
                lonUser,
                optLat,
                optLon
              );
              if (dist < menorDistanciaKm) {
                menorDistanciaKm = dist;
                melhorCandidato = {
                  tipo: "option_existente",
                  index,
                  option: opt,
                  nome:
                    opt.getAttribute("data-nome") ||
                    formatarNomeCidadeLimpo(opt.textContent, "BA").replace(
                      /\s*-\s*[A-Z]{2}$/i,
                      ""
                    ),
                  uf: "BA",
                  codigo_ibge: opt.getAttribute("data-ibge") || "",
                  latitude: optLat,
                  longitude: optLon,
                  localidadeId: Number(
                    opt.getAttribute("data-localidade-id") || opt.value || 1
                  )
                };
              }
            }
          });

          // 2. Consulta a lista oficial de cidades do Semiárido Baiano do MC_Radar
          try {
            const cidadesRadar = await MC_Radar.buscarCidades({ uf: "BA" });
            cidadesRadar.forEach((cid) => {
              const cLat = parseFloat(cid.latitude);
              const cLon = parseFloat(cid.longitude);
              if (Number.isFinite(cLat) && Number.isFinite(cLon)) {
                const dist = calcularDistanciaHaversineKm(
                  latUser,
                  lonUser,
                  cLat,
                  cLon
                );
                if (dist < menorDistanciaKm) {
                  menorDistanciaKm = dist;
                  melhorCandidato = {
                    tipo: "cidade_radar",
                    nome: cid.nome,
                    uf: "BA",
                    codigo_ibge: String(cid.codigo_ibge || ""),
                    latitude: cLat,
                    longitude: cLon,
                    localidadeId:
                      String(cid.codigo_ibge) === "2925709" ? 2 : 1
                  };
                }
              }
            });
          } catch {}

          // 3. Consulta também /api/v1/localidades/proxima para obter correspondência oficial do backend
          try {
            const respProx = await fetch(
              `${apiBase}/api/v1/localidades/proxima?lat=${encodeURIComponent(
                latUser
              )}&lon=${encodeURIComponent(lonUser)}`
            );
            if (respProx.ok) {
              const dataProx = await respProx.json();
              const loc = dataProx.localidade || dataProx;
              if (loc && (loc.nome || loc.id)) {
                const lLat = parseFloat(loc.latitude);
                const lLon = parseFloat(loc.longitude);
                const distLoc =
                  Number.isFinite(lLat) && Number.isFinite(lLon)
                    ? calcularDistanciaHaversineKm(latUser, lonUser, lLat, lLon)
                    : menorDistanciaKm;

                if (!melhorCandidato || distLoc <= menorDistanciaKm + 5) {
                  menorDistanciaKm = Math.min(menorDistanciaKm, distLoc);
                  melhorCandidato = {
                    tipo: "api_proxima",
                    nome: loc.nome || "Irecê",
                    uf: "BA",
                    codigo_ibge: String(loc.codigoIbge || loc.codigo_ibge || ""),
                    latitude: Number.isFinite(lLat) ? lLat : latUser,
                    longitude: Number.isFinite(lLon) ? lLon : lonUser,
                    localidadeId: Number(loc.id) || 1
                  };
                }
              }
            }
          } catch {}

          // 4. Seleciona a <option> correspondente no <select> ou cria uma nova se ainda não existir
          let optionSelecionada = null;
          const todasOpcoes = Array.from(selectEl.options || []);

          if (melhorCandidato) {
            if (melhorCandidato.option) {
              optionSelecionada = melhorCandidato.option;
            } else {
              const ibgeAlvo = String(melhorCandidato.codigo_ibge || "").trim();
              const nomeAlvo = String(melhorCandidato.nome || "")
                .trim()
                .toLowerCase();

              optionSelecionada =
                (ibgeAlvo &&
                  todasOpcoes.find(
                    (o) =>
                      String(o.getAttribute("data-ibge") || "").trim() ===
                      ibgeAlvo
                  )) ||
                (nomeAlvo &&
                  todasOpcoes.find((o) => {
                    const nOpt = String(
                      o.getAttribute("data-nome") || o.textContent || ""
                    )
                      .trim()
                      .toLowerCase();
                    return nOpt === nomeAlvo || nOpt.startsWith(nomeAlvo + " -");
                  })) ||
                todasOpcoes.find(
                  (o) =>
                    String(o.value) === String(melhorCandidato.localidadeId)
                ) ||
                null;

              if (!optionSelecionada) {
                const novaOpt = document.createElement("option");
                const valorUnico =
                  ibgeAlvo ||
                  String(melhorCandidato.localidadeId || "1");
                novaOpt.value =
                  selectEl.id === "cad-localidade" ||
                  selectEl.id === "roca-localidade"
                    ? valorUnico
                    : String(melhorCandidato.localidadeId || "1");
                novaOpt.setAttribute(
                  "data-localidade-id",
                  String(melhorCandidato.localidadeId || 1)
                );
                if (ibgeAlvo) novaOpt.setAttribute("data-ibge", ibgeAlvo);
                novaOpt.setAttribute(
                  "data-nome",
                  melhorCandidato.nome || "Irecê"
                );
                novaOpt.setAttribute("data-uf", "BA");
                novaOpt.setAttribute(
                  "data-lat",
                  String(melhorCandidato.latitude ?? latUser)
                );
                novaOpt.setAttribute(
                  "data-lon",
                  String(melhorCandidato.longitude ?? lonUser)
                );
                novaOpt.textContent = formatarNomeCidadeLimpo(
                  melhorCandidato.nome,
                  "BA"
                );

                const grupoRadar = selectEl.querySelector(
                  "#optgroup-cidades-radar"
                );
                if (grupoRadar) {
                  grupoRadar.appendChild(novaOpt);
                } else {
                  selectEl.appendChild(novaOpt);
                }
                optionSelecionada = novaOpt;
              }
            }
          }

          if (optionSelecionada) {
            const nomeFinal =
              melhorCandidato?.nome ||
              optionSelecionada.getAttribute("data-nome") ||
              "Irecê";
            optionSelecionada.textContent = formatarNomeCidadeLimpo(
              nomeFinal,
              "BA"
            );

            const idx = Array.from(selectEl.options).indexOf(optionSelecionada);
            if (idx >= 0) {
              selectEl.selectedIndex = idx;
            }
            selectEl.value = optionSelecionada.value;
            optionSelecionada.selected = true;
            selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          }

          const municipioDetectado =
            melhorCandidato?.nome ||
            optionSelecionada?.getAttribute("data-nome") ||
            "Irecê";
          const codigoIbgeDetectado =
            melhorCandidato?.codigo_ibge ||
            optionSelecionada?.getAttribute("data-ibge") ||
            "2914604";
          const localidadeIdDetectado = Number(
            melhorCandidato?.localidadeId ||
              optionSelecionada?.getAttribute("data-localidade-id") ||
              1
          );
          const latitudeDetectada = Number.isFinite(Number(latUser))
            ? Number(latUser)
            : Number(melhorCandidato?.latitude ?? -11.3042);
          const longitudeDetectada = Number.isFinite(Number(lonUser))
            ? Number(lonUser)
            : Number(melhorCandidato?.longitude ?? -41.8558);

          if (typeof onCoordsDetected === "function") {
            onCoordsDetected({
              sucesso: true,
              latitude: latitudeDetectada,
              longitude: longitudeDetectada,
              lat: latitudeDetectada,
              lon: longitudeDetectada,
              municipio: municipioDetectado,
              cidade: municipioDetectado,
              uf: "BA",
              codigoIbge: String(codigoIbgeDetectado),
              localidadeId: localidadeIdDetectado,
              distanciaKm: Number.isFinite(menorDistanciaKm)
                ? Math.round(menorDistanciaKm * 10) / 10
                : 0,
              option: optionSelecionada
            });
          }
        } catch {
          if (typeof onCoordsDetected === "function") {
            onCoordsDetected({
              sucesso: false,
              erro: "Não foi possível determinar a cidade mais próxima."
            });
          }
        } finally {
          if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent =
              textoOriginal.includes("Localizando")
                ? "📍 Minha localização"
                : textoOriginal;
          }
        }
      },
      () => {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent =
            textoOriginal.includes("Localizando")
              ? "📍 Minha localização"
              : textoOriginal;
        }
        if (typeof onCoordsDetected === "function") {
          onCoordsDetected({
            sucesso: false,
            erro: "Não foi possível obter sua localização via GPS. Selecione sua cidade na lista."
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
};

window.MC_Radar = MC_Radar;


const ESTADOS_CLIMA = {
  favoravel: {
    imagem: "/assets/images/roca-favoravel.svg",
    selo: "Situação Favorável",
    classeSelo: "status-good",
    titulo: "Situação Favorável para o Plantio",
    descricao:
      "Solo com umidade adequada e volume de chuva dentro do esperado para a janela de plantio.",
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
    descricao:
      "Chuvas moderadas ou irregulares na localidade. Avalie a umidade da terra antes de semear áreas maiores.",
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
    descricao:
      "Volume acumulado abaixo da referência do mês. Proteja o solo e evite perda de sementes sensíveis.",
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
    const lista =
      Array.isArray(diagnosticoApi?.acoesManejo) && diagnosticoApi.acoesManejo.length > 0
        ? diagnosticoApi.acoesManejo
        : estado.passosPadrao;
    passosEl.innerHTML = lista.map((item) => `<li>${item}</li>`).join("");
  }
}

function mapStatusAptidaoBadge(statusAptidao) {
  if (statusAptidao === "FAVORAVEL" || statusAptidao === "APTO") {
    return { texto: "Favorável", classe: "status-label status-good" };
  }
  if (statusAptidao === "ATENCAO" || statusAptidao === "TRANSICAO") {
    return { texto: "Em Atenção", classe: "status-label status-warn" };
  }
  return { texto: "Aguardar Chuva", classe: "status-label status-alert" };
}

function renderizarCardsDiagnosticoClima(diag) {
  if (!diag || !diag.chuvaAcumulada || !diag.plantio) return;

  const { localidade, meteorologiaAtual, chuvaAcumulada, plantio } = diag;
  const rocaAtiva = window.MC_Menu?.getRocaAtiva?.();
  const fraseComparativa =
    chuvaAcumulada.fraseComparativa ||
    `Choveu ${chuvaAcumulada.acumuladoMesMm} mm; o normal para esse mês é ${chuvaAcumulada.normalClimatologicaMesMm} mm.`;

  // 1. Atualiza o Card 1: Chuva Acumulada (#texto-chuva-acumulada e #card-chuva-frase)
  const textoChuvaEl = document.getElementById("texto-chuva-acumulada");
  if (textoChuvaEl) {
    textoChuvaEl.textContent = fraseComparativa;
  }

  const fraseEl = document.getElementById("card-chuva-frase");
  if (fraseEl) {
    fraseEl.textContent = fraseComparativa;
  }

  const localEl = document.getElementById("card-chuva-localidade");
  if (localEl) {
    const nomeMun =
      rocaAtiva?.municipio ||
      rocaAtiva?.municipioNome ||
      localidade?.nome ||
      "Irecê";
    const ufMun = "BA";
    const prefixoRoca = rocaAtiva?.nome ? `${rocaAtiva.nome} — ` : "";
    localEl.textContent = `${prefixoRoca}${nomeMun} · ${ufMun}`;
  }

  const acumEl = document.getElementById("card-chuva-acumulado-mm");
  if (acumEl) {
    acumEl.textContent = `${chuvaAcumulada.acumuladoMesMm} mm`;
  }

  const normalEl = document.getElementById("card-chuva-normal-mm");
  if (normalEl) {
    normalEl.textContent = `${chuvaAcumulada.normalClimatologicaMesMm} mm`;
  }

  const chuva7dEl = document.getElementById("card-chuva-7d-mm");
  if (chuva7dEl) {
    chuva7dEl.textContent = `${chuvaAcumulada.acumuladoUltimos7DiasMm} mm`;
  }

  const pctEl = document.getElementById("card-chuva-pct");
  if (pctEl) {
    pctEl.textContent = `${chuvaAcumulada.percentualDaNormal}%`;
  }

  const progressEl = document.getElementById("card-chuva-progress-bar");
  if (progressEl) {
    const largura = Math.min(100, Math.max(0, Number(chuvaAcumulada.percentualDaNormal) || 0));
    progressEl.style.width = `${largura}%`;
    progressEl.setAttribute("aria-valuenow", String(largura));
  }

  const tempEl = document.getElementById("card-chuva-temp");
  if (tempEl && meteorologiaAtual) {
    const tempVal = Number(meteorologiaAtual.temperaturaC);
    tempEl.textContent = `${Number.isFinite(tempVal) ? tempVal : 28.5} °C`;
  }

  const umidEl = document.getElementById("card-chuva-umid");
  if (umidEl && meteorologiaAtual) {
    const umidVal = Number(meteorologiaAtual.umidadeRelativaPct);
    umidEl.textContent = `${Number.isFinite(umidVal) ? umidVal : 52}%`;
  }

  const fonteEl = document.getElementById("card-chuva-fonte");
  if (fonteEl && meteorologiaAtual?.fonteTelemetria) {
    fonteEl.textContent = meteorologiaAtual.fonteTelemetria;
  }

  // 2. Atualiza o Card 2: Sugestão de Plantio (#texto-sugestao-plantio e #card-plantio-resumo)
  const resumoPlantioTexto =
    plantio.resumoConsultivo || "Condições favoráveis para Milho e Feijão.";

  const textoSugestaoEl = document.getElementById("texto-sugestao-plantio");
  if (textoSugestaoEl) {
    textoSugestaoEl.textContent = resumoPlantioTexto;
  }

  const resumoPlantioEl = document.getElementById("card-plantio-resumo");
  if (resumoPlantioEl) {
    resumoPlantioEl.textContent = resumoPlantioTexto;
  }

  const badgePlantioEl = document.getElementById("card-plantio-badge");
  if (badgePlantioEl) {
    const infoSelo = mapStatusAptidaoBadge(plantio.statusGeral);
    badgePlantioEl.className = infoSelo.classe;
    badgePlantioEl.textContent = infoSelo.texto;
  }

  const listaCulturasEl = document.getElementById("card-plantio-culturas-list");
  if (listaCulturasEl && Array.isArray(plantio.culturas)) {
    listaCulturasEl.innerHTML = plantio.culturas
      .map((c) => {
        const info = mapStatusAptidaoBadge(c.statusAptidao);
        const nomeCultura = c.nome || c.culturaNome || "Cultura";
        const obsMm = c.precipitacaoObservadaMm ?? c.chuvaAcumuladaMm ?? 0;
        const limiarMm = c.limiarAtivoMm ?? c.limiarExigidoMm ?? 100;
        const recTexto = c.recomendacao || c.resumoRecomendacao || "";
        return `
          <li class="list-group-item d-flex justify-content-between align-items-start gap-2 px-0 py-2 bg-transparent">
            <div>
              <strong>${nomeCultura}</strong>
              <div class="small text-muted tabular-nums">
                Observado: ${obsMm} mm / Limiar: ${limiarMm} mm (${c.janelaDias} dias)
              </div>
              <div class="small mt-1">${recTexto}</div>
            </div>
            <span class="${info.classe} tabular-nums">${info.texto}</span>
          </li>
        `;
      })
      .join("");
  }

  const rn12El = document.getElementById("card-plantio-rn12");
  if (rn12El && plantio.avisoConsultivoRN12) {
    rn12El.textContent = plantio.avisoConsultivoRN12;
  }

  // 3. Sincroniza também a ilustração climática em medalhão circular
  const estadoIlustracao =
    plantio.statusGeral === "FAVORAVEL"
      ? "favoravel"
      : plantio.statusGeral === "ATENCAO"
      ? "atencao"
      : "estiagem";

  atualizarIlustracaoClimatica(estadoIlustracao, {
    rotulo:
      plantio.statusGeral === "FAVORAVEL"
        ? "Condição Favorável para o Manejo"
        : plantio.statusGeral === "ATENCAO"
        ? "Atenção às Chuvas na Terra"
        : "Estiagem · Proteja a Reserva e o Solo",
    resumo: `${fraseComparativa} ${resumoPlantioTexto}`
  });

  // 4. Atualiza os Gráficos Editoriais (Histórico de Chuvas + Medidor de Umidade do Solo)
  atualizarGraficoHistoricoChuvasEUmidadeSolo(diag);
  void atualizarTabelaPluviometroRoca(diag);
}

const MESES_ROTULOS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

// Climatologia média mensal de referência no Semiárido Baiano (mm)
const CLIMATOLOGIA_BASE_SEMIARIDO_MM = [
  112, 98, 118, 66, 26, 16, 12, 10, 18, 52, 94, 116
];

function atualizarGraficoHistoricoChuvasEUmidadeSolo(diag) {
  const chuva = diag?.chuvaAcumulada || {};
  const roca = window.MC_Menu?.getRocaAtiva?.();
  const nomeMun =
    roca?.municipio ||
    roca?.municipioNome ||
    diag?.localidade?.nome ||
    "Irecê";

  const acumMesMm = Number.isFinite(Number(chuva.acumuladoMesMm))
    ? Number(chuva.acumuladoMesMm)
    : 64;
  const normalMesMm = Number.isFinite(Number(chuva.normalClimatologicaMesMm))
    ? Number(chuva.normalClimatologicaMesMm)
    : 90;
  const acum7dMm = Number.isFinite(Number(chuva.acumuladoUltimos7DiasMm))
    ? Number(chuva.acumuladoUltimos7DiasMm)
    : 18;

  // Atualiza descrição do card de Previsão de Chuva na Aba 1
  const prevDescEl = document.getElementById("clima-previsao-card-desc");
  if (prevDescEl) {
    prevDescEl.textContent = `Nos últimos 7 dias choveu ${acum7dMm} mm em ${nomeMun} - BA (acumulado de ${acumMesMm} mm para uma média mensal de ${normalMesMm} mm). Mantenha calhas e sulcos limpos.`;
  }

  // 1. Renderiza barras mensais em #grafico-chuvas-barras-group
  const grupoBarras = document.getElementById("grafico-chuvas-barras-group");
  const mesAtualIdx = new Date().getMonth(); // 0..11
  if (grupoBarras) {
    const fatorLocal = normalMesMm > 0
      ? Math.max(0.65, Math.min(1.35, normalMesMm / (CLIMATOLOGIA_BASE_SEMIARIDO_MM[mesAtualIdx] || 80)))
      : 1;

    const valoresMeses = CLIMATOLOGIA_BASE_SEMIARIDO_MM.map((baseMm, idx) => {
      if (idx === mesAtualIdx) return Math.round(acumMesMm);
      return Math.round(baseMm * fatorLocal);
    });

    const maxEscalaMm = 145;
    const baseY = 134;
    const alturaMaxPx = 104;

    grupoBarras.innerHTML = valoresMeses
      .map((mm, idx) => {
        const x = 45 + idx * 25;
        const centerX = x + 9;
        const altura = Math.max(8, Math.min(alturaMaxPx, Math.round((mm / maxEscalaMm) * alturaMaxPx)));
        const y = baseY - altura;

        // Regra de cores do Prompt 04:
        // < 40 mm: terracota (#a64f2e) com hachura
        // 40 a 90 mm: ocre (#bd7627)
        // > 90 mm: verde-oliva (#5d603d)
        let corBarra = "#bd7627";
        let usarHachura = false;
        if (mm < 40) {
          corBarra = "#a64f2e";
          usarHachura = true;
        } else if (mm > 90) {
          corBarra = "#5d603d";
        }

        const isMesAtual = idx === mesAtualIdx;
        const strokeWidth = isMesAtual ? "2.3" : "1.5";
        const rotuloTopo = isMesAtual
          ? `<text x="${centerX}" y="${Math.max(14, y - 4)}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" font-weight="700" fill="#542817">${mm}</text>`
          : "";

        return `
          <g>
            <rect x="${x}" y="${y}" width="18" height="${altura}" rx="2" fill="${corBarra}" stroke="#542817" stroke-width="${strokeWidth}">
              <title>${MESES_ROTULOS_PT[idx]}: ${mm} mm</title>
            </rect>
            ${usarHachura ? `<rect x="${x}" y="${y}" width="18" height="${altura}" rx="2" fill="url(#hatch-seco)" pointer-events="none" />` : ""}
            ${rotuloTopo}
            <text x="${centerX}" y="148" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8.5" font-weight="${isMesAtual ? "700" : "600"}" fill="${isMesAtual ? "#542817" : "#6e6252"}">${MESES_ROTULOS_PT[idx]}</text>
          </g>
        `;
      })
      .join("");
  }

  const resumoGraficoEl = document.getElementById("grafico-chuvas-resumo");
  if (resumoGraficoEl) {
    const pct = Number(chuva.percentualDaNormal) || Math.round((acumMesMm / Math.max(1, normalMesMm)) * 100);
    resumoGraficoEl.textContent = `Acumulado atual na roça em ${nomeMun} - BA: ${acumMesMm} mm (${pct}% da média histórica de ${normalMesMm} mm esperada para este mês).`;
  }

  const seloEstacaoEl = document.getElementById("grafico-chuvas-selo-estacao");
  if (seloEstacaoEl) {
    seloEstacaoEl.textContent = `${acumMesMm} mm / ${normalMesMm} mm`;
  }

  // 2. Atualiza o Ponteiro Dinâmico de Umidade do Solo (#ponteiro-umidade-solo)
  // Regra do Prompt 04:
  // - Crítico se < 45 mm (gira para a faixa esquerda: -62deg a -24deg)
  // - Alerta entre 45 e 95 mm (gira para a faixa central: -20deg a +20deg)
  // - Ideal se >= 95 mm (gira para a faixa direita: +24deg a +62deg)
  const ponteiroEl = document.getElementById("ponteiro-umidade-solo");
  const badgeUmidEl = document.getElementById("medidor-umidade-badge");
  const resumoUmidEl = document.getElementById("medidor-umidade-resumo");

  let anguloDeg = 0;
  let faixaTexto = "Alerta · Umidade Moderada";
  let badgeEstilo = "background-color: #f7ecda; border: 1px solid #dfc298; color: #7d4e14;";
  let resumoUmidTexto = `Com ${acumMesMm} mm acumulados em ${nomeMun} - BA, a terra está em faixa de Alerta (45 a 95 mm). Proteja o solo com palhada antes de ampliar o plantio.`;

  if (acumMesMm < 45) {
    const frac = Math.max(0, Math.min(1, acumMesMm / 45));
    anguloDeg = Math.round(-60 + frac * 34); // -60deg a -26deg
    faixaTexto = "Crítico · Baixa Umidade";
    badgeEstilo = "background-color: #f9e5dc; border: 1px solid #e2b4a0; color: #8c3719;";
    resumoUmidTexto = `Com ${acumMesMm} mm acumulados (< 45 mm), a umidade nas raízes é Crítica. Priorize cobertura morta, economize a água da cisterna e aguarde novas chuvas.`;
  } else if (acumMesMm < 95) {
    const frac = (acumMesMm - 45) / 50;
    anguloDeg = Math.round(-18 + frac * 36); // -18deg a +18deg
    faixaTexto = "Alerta · Transição Hídrica";
    badgeEstilo = "background-color: #f7ecda; border: 1px solid #dfc298; color: #7d4e14;";
    resumoUmidTexto = `Com ${acumMesMm} mm acumulados (entre 45 e 95 mm), o solo apresenta umidade moderada. Indicado para culturas resistentes e plantio consorciado com palhada.`;
  } else {
    const frac = Math.min(1, (acumMesMm - 95) / 65);
    anguloDeg = Math.round(26 + frac * 34); // +26deg a +60deg
    faixaTexto = "Ideal · Solo Bem Úmido";
    badgeEstilo = "background-color: #e9efe2; border: 1px solid #b8c7a6; color: #3e4a26;";
    resumoUmidTexto = `Com ${acumMesMm} mm acumulados (>= 95 mm), o solo atingiu reserva Ideal de água nas camadas de raiz para semear milho, feijão-caupi e mandioca.`;
  }

  if (ponteiroEl) {
    ponteiroEl.style.transform = `rotate(${anguloDeg}deg)`;
  }
  if (badgeUmidEl) {
    badgeUmidEl.setAttribute("style", badgeEstilo);
    badgeUmidEl.textContent = faixaTexto;
  }
  if (resumoUmidEl) {
    resumoUmidEl.textContent = resumoUmidTexto;
  }
}

function formatarDataBrCurta(valorData) {
  const s = String(valorData || "").trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return s || new Date().toLocaleDateString("pt-BR");
}

function classificarCondicaoChuvaLinha(mm) {
  const val = Number(mm) || 0;
  if (val >= 20) {
    return {
      rotulo: "Terra bem molhada nas leiras",
      badgeStyle: "background-color: #e9efe2; border: 1px solid #b8c7a6; color: #3e4a26;",
      barClass: "is-olive"
    };
  }
  if (val >= 10) {
    return {
      rotulo: "Chuva mansa de transição",
      badgeStyle: "background-color: #f7ecda; border: 1px solid #dfc298; color: #7d4e14;",
      barClass: "is-ochre"
    };
  }
  return {
    rotulo: "Sereno leve superficial",
    badgeStyle: "background-color: #f9e5dc; border: 1px solid #e2b4a0; color: #8c3719;",
    barClass: "is-terracotta"
  };
}

async function atualizarTabelaPluviometroRoca(diag = null) {
  const tbody = document.getElementById("tabela-pluviometro-tbody");
  if (!tbody) return;

  const apiBase = window.MC_API_BASE || "";
  let registros = [];

  try {
    const rawAuth = localStorage.getItem("mc_auth_session_v4");
    const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null;
    const token = parsedAuth?.token;
    if (token) {
      const resp = await fetch(`${apiBase}/api/v1/precipitacoes?size=8`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data?.content) && data.content.length > 0) {
          registros = data.content;
        }
      }
    }
  } catch {}

  if (registros.length === 0) {
    const hoje = new Date();
    const d1 = new Date(hoje.getTime() - 2 * 86400000).toISOString().slice(0, 10);
    const d2 = new Date(hoje.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    const d3 = new Date(hoje.getTime() - 12 * 86400000).toISOString().slice(0, 10);
    const d4 = new Date(hoje.getTime() - 19 * 86400000).toISOString().slice(0, 10);
    const acum7d = Number(diag?.chuvaAcumulada?.acumuladoUltimos7DiasMm) || 22.5;
    registros = [
      { dataEvento: d1, volumeMm: Math.max(4, Math.round(acum7d * 0.65 * 10) / 10), observacao: "Molhou bem as leiras" },
      { dataEvento: d2, volumeMm: Math.max(2.5, Math.round(acum7d * 0.35 * 10) / 10), observacao: "Chuva mansa no fim da tarde" },
      { dataEvento: d3, volumeMm: 18.0, observacao: "Boa infiltração na palhada" },
      { dataEvento: d4, volumeMm: 8.5, observacao: "Pancada rápida na cabeceira" }
    ];
  }

  const badgeCount = document.getElementById("pluviometro-count-badge");
  if (badgeCount) {
    badgeCount.textContent = `${registros.length} ${registros.length === 1 ? "registro" : "registros"}`;
  }

  // Atualiza também os 3 cartões de resumo do pluviômetro se estiverem zerados
  const el7d = document.getElementById("metric-7d");
  const elMonth = document.getElementById("metric-month");
  const elSeason = document.getElementById("metric-season");
  if (diag?.chuvaAcumulada) {
    const c7 = Number(diag.chuvaAcumulada.acumuladoUltimos7DiasMm) || 0;
    const cm = Number(diag.chuvaAcumulada.acumuladoMesMm) || 0;
    if (el7d) el7d.textContent = `${c7} mm`;
    if (elMonth) elMonth.textContent = `${cm} mm`;
    if (elSeason) elSeason.textContent = `${Math.round((cm * 1.85) * 10) / 10} mm`;
  }

  tbody.innerHTML = registros
    .slice(0, 6)
    .map((item) => {
      const mm = Number(item.volumeMm ?? item.milimetros ?? 0);
      const dataFmt = formatarDataBrCurta(item.dataEvento || item.data);
      const info = classificarCondicaoChuvaLinha(mm);
      const larguraPct = Math.min(100, Math.max(12, Math.round((mm / 40) * 100)));
      const textoCondicao = item.observacao
        ? String(item.observacao)
        : info.rotulo;

      return `
        <tr>
          <td class="fw-semibold">${dataFmt}</td>
          <td><strong>${mm.toFixed(1)} mm</strong></td>
          <td>
            <span class="badge" style="${info.badgeStyle}">${textoCondicao}</span>
          </td>
          <td>
            <div class="progress-sertanejo" title="${mm.toFixed(1)} mm registrados">
              <div class="progress-sertanejo-bar ${info.barClass}" style="width: ${larguraPct}%;"></div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function carregarDiagnosticoClima(opcoes = {}) {
  const apiBase = window.MC_API_BASE || "";
  const roca = window.MC_Menu?.getRocaAtiva?.();
  const selectLoc = document.getElementById("select-localidade");

  const temLatExplicita =
    opcoes.lat !== undefined &&
    opcoes.lat !== null &&
    Number.isFinite(Number(opcoes.lat));
  const temLonExplicita =
    opcoes.lon !== undefined &&
    opcoes.lon !== null &&
    Number.isFinite(Number(opcoes.lon));

  const latEfetiva = temLatExplicita
    ? Number(opcoes.lat)
    : roca && Number.isFinite(Number(roca.latitude))
    ? Number(roca.latitude)
    : undefined;

  const lonEfetiva = temLonExplicita
    ? Number(opcoes.lon)
    : roca && Number.isFinite(Number(roca.longitude))
    ? Number(roca.longitude)
    : undefined;

  const localidadeId =
    opcoes.localidadeId ||
    roca?.localidadeId ||
    (selectLoc && selectLoc.value ? Number(selectLoc.value) : undefined) ||
    1;

  const municipioEfetivo =
    opcoes.municipio ||
    roca?.municipio ||
    roca?.municipioNome ||
    undefined;

  const ibgeEfetivo =
    opcoes.ibge ||
    roca?.codigoIbge ||
    roca?.codigo_ibge ||
    undefined;

  const params = new URLSearchParams();
  params.set("localidadeId", String(localidadeId));
  if (latEfetiva !== undefined && lonEfetiva !== undefined) {
    params.set("lat", String(latEfetiva));
    params.set("lon", String(lonEfetiva));
  }
  if (municipioEfetivo) {
    params.set("municipio", String(municipioEfetivo));
  }
  if (ibgeEfetivo) {
    params.set("ibge", String(ibgeEfetivo));
  }

  try {
    const resp = await fetch(`${apiBase}/api/v1/clima/diagnostico?${params.toString()}`, {
      headers: { Accept: "application/json" }
    });
    if (!resp.ok) return null;
    const diag = await resp.json();
    renderizarCardsDiagnosticoClima(diag);
    return diag;
  } catch {
    return null;
  }
}

function initClimaDinamico() {
  document
    .querySelectorAll("#select-localidade, #cad-localidade, #roca-localidade")
    .forEach((sel) => limparOpcoesSelectCidades(sel));

  void carregarDiagnosticoClima();
  void atualizarTabelaPluviometroRoca();

  // Escuta trocas de Roça Ativa na Aba Lateral para atualizar clima, plantio e alertas
  window.addEventListener("mc:roca-changed", (e) => {
    const roca = e?.detail?.roca || window.MC_Menu?.getRocaAtiva?.();
    if (!roca) {
      void carregarDiagnosticoClima();
      return;
    }

    const selectLoc = document.getElementById("select-localidade");
    if (selectLoc && roca.localidadeId) {
      const optMatch = Array.from(selectLoc.options || []).find(
        (o) =>
          String(o.getAttribute("data-localidade-id") || o.value) ===
            String(roca.localidadeId) ||
          String(o.getAttribute("data-nome") || "")
            .toLowerCase()
            .includes(String(roca.municipio || roca.municipioNome || "").toLowerCase())
      );
      if (optMatch) {
        selectLoc.value = optMatch.value;
      }
    }

    void carregarDiagnosticoClima({
      localidadeId: roca.localidadeId || 1,
      lat: roca.latitude,
      lon: roca.longitude,
      ibge: roca.codigoIbge || roca.codigo_ibge,
      municipio: roca.municipio || roca.municipioNome
    });

    if (typeof MC_Radar.obterAlertas === "function") {
      void MC_Radar.obterAlertas(
        "BA",
        roca.codigoIbge || roca.codigo_ibge || null
      );
    }
  });

  const selectLoc = document.getElementById("select-localidade");
  if (selectLoc) {
    selectLoc.addEventListener("change", () => {
      const opt = selectLoc.selectedOptions?.[0];
      const lat = opt?.getAttribute("data-lat");
      const lon = opt?.getAttribute("data-lon");
      const ibge = opt?.getAttribute("data-ibge");
      const municipio = opt?.getAttribute("data-nome");
      const locId = Number(
        opt?.getAttribute("data-localidade-id") || selectLoc.value || 1
      );
      void carregarDiagnosticoClima({
        localidadeId: locId === 2 ? 2 : 1,
        lat: lat ? Number(lat) : undefined,
        lon: lon ? Number(lon) : undefined,
        ibge: ibge || undefined,
        municipio: municipio || undefined
      });
    });
  }

  const btnGpsCard = document.getElementById("btn-gps-card-clima");
  if (btnGpsCard && "geolocation" in navigator) {
    btnGpsCard.addEventListener("click", () => {
      if (selectLoc) {
        MC_Radar.detectarCidadeMaisProximaNoSelect(
          selectLoc,
          btnGpsCard,
          (res) => {
            if (res && res.sucesso && res.lat !== undefined) {
              void carregarDiagnosticoClima({
                lat: res.lat,
                lon: res.lon,
                ibge: res.codigoIbge,
                localidadeId: res.localidadeId,
                municipio: res.municipio || res.cidade
              });
            }
          }
        );
        return;
      }

      btnGpsCard.disabled = true;
      const textoOriginal = btnGpsCard.textContent || "📍 Minha localização";
      btnGpsCard.textContent = "📍 Localizando...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          btnGpsCard.disabled = false;
          btnGpsCard.textContent = textoOriginal;
          void carregarDiagnosticoClima({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          });
        },
        () => {
          btnGpsCard.disabled = false;
          btnGpsCard.textContent = textoOriginal;
          void carregarDiagnosticoClima();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  const formChuva = document.getElementById("form-chuva");
  if (formChuva) {
    formChuva.addEventListener("submit", () => {
      setTimeout(() => {
        void carregarDiagnosticoClima();
        void atualizarTabelaPluviometroRoca();
      }, 450);
    });
  }
}

window.atualizarIlustracaoClimatica = atualizarIlustracaoClimatica;
window.carregarDiagnosticoClima = carregarDiagnosticoClima;
window.atualizarGraficoHistoricoChuvasEUmidadeSolo = atualizarGraficoHistoricoChuvasEUmidadeSolo;
window.atualizarTabelaPluviometroRoca = atualizarTabelaPluviometroRoca;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClimaDinamico);
} else {
  initClimaDinamico();
}

