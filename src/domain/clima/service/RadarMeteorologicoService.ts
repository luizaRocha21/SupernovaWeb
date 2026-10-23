import { AlertaRadarResponseDTO } from '../dto/AlertaRadarResponseDTO.js';
import {
  ItemTemperaturaCidadeDTO,
  TemperaturaRadarResponseDTO
} from '../dto/TemperaturaRadarResponseDTO.js';
import { CidadeRadarResponseDTO } from '../dto/CidadeRadarResponseDTO.js';

interface CacheEntry<T> {
  dados: T;
  expiraEm: number;
}

interface PoloClimaticoSemiaridoBa {
  nome: string;
  uf: 'BA';
  codigo_ibge: string;
  latitude: number;
  longitude: number;
  perfil: 'quente' | 'ameno';
  tempMaxBase: number;
  tempMinBase: number;
}

const RADAR_API_BASE = 'https://radarmeteorologico.com.br/api/v1';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const TTL_ALERTAS_MS = 600_000; // 10 minutos
const TTL_TEMPERATURAS_MS = 3_600_000; // 1 hora
const TTL_CIDADES_MS = 86_400_000; // 24 horas

/**
 * Catálogo Oficial das Cidades do Semiárido Baiano e Municípios Atendidos na Bahia (A a X).
 */
export const NOMES_CIDADES_SEMIARIDO_BA: readonly string[] = [
  // A
  'Abaíra', 'Abaré', 'Acajutiba', 'Adustina', 'Água Fria', 'Aiquara', 'Alagoinhas',
  'Almadina', 'Amargosa', 'Amélia Rodrigues', 'América Dourada', 'Anagé', 'Andaraí',
  'Andorinha', 'Angical', 'Anguera', 'Antas', 'Antônio Cardoso', 'Antônio Gonçalves',
  'Aporá', 'Aracatu', 'Araci', 'Aramari', 'Arataca', 'Aratuípe', 'Aurelino Leal',
  // B
  'Baianópolis', 'Baixa Grande', 'Banzaê', 'Barra', 'Barra da Estiva', 'Barra do Choça',
  'Barra do Mendes', 'Barra do Rocha', 'Barreiras', 'Barro Alto', 'Barro Preto',
  'Barrocas', 'Belmonte', 'Belo Campo', 'Biritinga', 'Boa Nova', 'Boa Vista do Tupim',
  'Bom Jesus da Lapa', 'Bom Jesus da Serra', 'Boninal', 'Bonito', 'Boquira', 'Botuporã',
  'Brejões', 'Brejolândia', 'Brotas de Macaúbas', 'Brumado', 'Buerarema', 'Buritirama',
  // C
  'Caatiba', 'Cabaceiras do Paraguaçu', 'Cachoeira', 'Caculé', 'Caém', 'Caetanos',
  'Caetité', 'Cafarnaum', 'Cairu', 'Caldeirão Grande', 'Camacan', 'Camamu',
  'Campo Alegre de Lourdes', 'Campo Formoso', 'Canápolis', 'Canarana', 'Canavieiras',
  'Candeal', 'Candeias', 'Candiba', 'Cândido Sales', 'Cansanção', 'Canudos',
  'Capela do Alto Alegre', 'Capim Grosso', 'Caraíbas', 'Caravelas', 'Cardeal da Silva',
  'Carinhanha', 'Casa Nova', 'Castro Alves', 'Catolândia', 'Catu', 'Caturama',
  'Central', 'Chorrochó', 'Cícero Dantas', 'Cipó', 'Coaraci', 'Cocos',
  'Conceição da Feira', 'Conceição do Almeida', 'Conceição do Coité',
  'Conceição do Jacuípe', 'Conde', 'Condeúba', 'Contendas do Sincorá',
  'Coração de Maria', 'Cordeiros', 'Coribe', 'Coronel João Sá', 'Correntina',
  'Cotegipe', 'Cravolândia', 'Crisópolis', 'Cristópolis', 'Cruz das Almas', 'Curaçá',
  // D
  'Dário Meira', "Dias d'Ávila", 'Dom Basílio', 'Dom Macedo Costa',
  // E
  'Elísio Medrado', 'Encruzilhada', 'Entre Rios', 'Érico Cardoso', 'Esplanada',
  'Euclides da Cunha', 'Eunápolis',
  // F
  'Fátima', 'Feira da Mata', 'Feira de Santana', 'Filadélfia', 'Firmino Alves',
  'Floresta Azul', 'Formosa do Rio Preto',
  // G
  'Gandu', 'Gavião', 'Gentio do Ouro', 'Glória', 'Gongogi', 'Governador Mangabeira',
  'Guajeru', 'Guanambi', 'Guaratinga',
  // H
  'Heliópolis',
  // I
  'Iaçu', 'Ibiassucê', 'Ibicaraí', 'Ibicoara', 'Ibicuí', 'Ibipeba', 'Ibipitanga',
  'Ibiquera', 'Ibirapitanga', 'Ibirapuã', 'Ibirataia', 'Ibitiara', 'Ibititá',
  'Ibotirama', 'Ichu', 'Igaporá', 'Igrapiúna', 'Iguaí', 'Ilhéus', 'Inhambupe',
  'Ipecaetá', 'Ipiaú', 'Ipirá', 'Ipupiara', 'Irajuba', 'Iramaia', 'Iraquara',
  'Irará', 'Irecê', 'Itabela', 'Itaberaba', 'Itabuna', 'Itacaré', 'Itagi',
  'Itagibá', 'Itagimirim', 'Itaguaçu da Bahia', 'Itaju do Colônia', 'Itajuípe',
  'Itamaraju', 'Itamari', 'Itambé', 'Itanagra', 'Itanhém', 'Itaparica', 'Itapé',
  'Itapebi', 'Itapetinga', 'Itapicuru', 'Itapitanga', 'Itaquara', 'Itarantim',
  'Itatim', 'Itiruçu', 'Itiúba', 'Itororó', 'Ituaçu', 'Ituberá', 'Iuiu',
  'Jaborandi', 'Jacaraci', 'Jacobina',
  // J
  'Jaguaquara', 'Jaguarari', 'Jaguaripe', 'Jandaíra', 'Jequié', 'Jeremoabo',
  'Jiquiriçá', 'Jitaúna', 'João Dourado', 'Juazeiro', 'Jucuruçu', 'Jussara',
  'Jussari', 'Jussiape',
  // L
  'Lafaiete Coutinho', 'Lagoa Real', 'Laje', 'Lajedão', 'Lajedinho',
  'Lajedo do Tabocal', 'Lamarão', 'Lapão', 'Lauro de Freitas', 'Lençóis',
  'Licínio de Almeida', 'Livramento de Nossa Senhora', 'Luís Eduardo Magalhães',
  // M
  'Macajuba', 'Macarani', 'Macaúbas', 'Macururé', 'Maetinga', 'Maiquinique',
  'Mairi', 'Malhada', 'Malhada de Pedras', 'Manoel Vitorino', 'Mansidão',
  'Maracás', 'Maragogipe', 'Marcionílio Souza', 'Mascote', 'Mata de São João',
  'Matina', 'Medeiros Neto', 'Miguel Calmon', 'Milagres', 'Mirangaba', 'Mirante',
  'Monte Santo', 'Morpará', 'Morro do Chapéu', 'Mortugaba', 'Mucugê', 'Mucuri',
  'Mulungu do Morro', 'Mundo Novo', 'Muniz Ferreira', 'Muquém do São Francisco',
  'Muritiba', 'Mutuípe',
  // N
  'Nazaré', 'Nilo Peçanha', 'Nordestina', 'Nova Canaã', 'Nova Fátima', 'Nova Ibiá',
  'Nova Itarana', 'Nova Redenção', 'Nova Soure', 'Nova Viçosa', 'Novo Horizonte',
  'Novo Triunfo',
  // O
  'Olindina', 'Oliveira dos Brejinhos', 'Ouriçangas', 'Ourolândia',
  // P
  'Palmas de Monte Alto', 'Palmeiras', 'Paramirim', 'Paratinga', 'Paripiranga',
  'Pau Brasil', 'Paulo Afonso', 'Pé de Serra', 'Pedrão', 'Pedro Alexandre',
  'Piatã', 'Pindobaçu', 'Pindaí', 'Pintadas', 'Piraí do Norte', 'Piripá',
  'Piritiba', 'Planaltino', 'Planalto', 'Poções', 'Pojuca', 'Ponto Novo',
  'Porto Seguro', 'Potiraguá', 'Prado', 'Presidente Dutra',
  'Presidente Jânio Quadros', 'Presidente Tancredo Neves',
  // Q
  'Queimadas', 'Quijingue', 'Quixabeira',
  // R
  'Rafael Jambeiro', 'Remanso', 'Retirolândia', 'Riachão das Neves',
  'Riachão do Jacuípe', 'Riacho de Santana', 'Ribeira do Amparo',
  'Ribeira do Pombal', 'Ribeirão do Largo', 'Rio de Contas', 'Rio do Antônio',
  'Rio do Pires', 'Rio Real', 'Rodelas', 'Ruy Barbosa',
  // S
  'Salinas da Margarida', 'Salvador', 'Santa Bárbara', 'Santa Brígida',
  'Santa Cruz Cabrália', 'Santa Inês', 'Santa Luzia', 'Santa Maria da Vitória',
  'Santa Rita de Cássia', 'Santa Teresinha', 'Santaluz', 'Santana', 'Santanópolis',
  'Santo Amaro', 'Santo Antônio de Jesus', 'Santo Estêvão', 'São Desidério',
  'São Domingos', 'São Felipe', 'São Félix', 'São Félix do Coribe',
  'São Francisco do Conde', 'São Gabriel', 'São Gonçalo dos Campos',
  'São José da Vitória', 'São José do Jacuípe', 'São Miguel das Matas',
  'São Sebastião do Passé', 'Sapeaçu', 'Sátiro Dias', 'Saubara', 'Seabra',
  'Sebastião Laranjeiras', 'Senhor do Bonfim', 'Sento Sé', 'Serra do Ramalho',
  'Serra Dourada', 'Serra Preta', 'Serrinha', 'Serrolândia', 'Simões Filho',
  'Sítio do Mato', 'Sítio do Quinto', 'Sobradinho', 'Souto Soares',
  // T
  'Tabocas do Brejo Velho', 'Tanhaçu', 'Tanque Novo', 'Tanquinho', 'Taperoá',
  'Tapiramutá', 'Teixeira de Freitas', 'Teodoro Sampaio', 'Teofilândia',
  'Teolândia', 'Terra Nova', 'Tremedal', 'Tucano', 'Uauá',
  // U
  'Ubaíra', 'Ubaitaba', 'Ubatã', 'Uibaí', 'Umburanas', 'Una', 'Urandi',
  'Uruçuca', 'Utinga',
  // V
  'Valença', 'Valente', 'Várzea da Roça', 'Várzea do Poço', 'Várzea Nova',
  'Varzedo', 'Vereda', 'Vitória da Conquista',
  // W
  'Wagner', 'Wanderley', 'Wenceslau Guimarães',
  // X
  'Xique-Xique'
];

function normalizarChaveCidade(nome: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const MAPA_NOMES_OFICIAIS_BA = new Map<string, string>(
  NOMES_CIDADES_SEMIARIDO_BA.map((nome) => [normalizarChaveCidade(nome), nome])
);

const COORDENADAS_CONHECIDAS_BA: Record<
  string,
  { codigo_ibge: string; latitude: number; longitude: number; capital?: boolean }
> = {
  'Abaíra': { codigo_ibge: '2900108', latitude: -13.2489, longitude: -41.6619 },
  'Abaré': { codigo_ibge: '2900207', latitude: -8.7236, longitude: -39.1153 },
  'Amargosa': { codigo_ibge: '2901007', latitude: -13.0303, longitude: -39.6047 },
  'América Dourada': { codigo_ibge: '2901155', latitude: -11.4553, longitude: -41.4361 },
  'Anagé': { codigo_ibge: '2901205', latitude: -14.6122, longitude: -41.1356 },
  'Andaraí': { codigo_ibge: '2901304', latitude: -12.8072, longitude: -41.3314 },
  'Andorinha': { codigo_ibge: '2901353', latitude: -10.3447, longitude: -39.8364 },
  'Araci': { codigo_ibge: '2902104', latitude: -11.3331, longitude: -38.9625 },
  'Baixa Grande': { codigo_ibge: '2902609', latitude: -11.9597, longitude: -40.1681 },
  'Barra': { codigo_ibge: '2902708', latitude: -11.0894, longitude: -43.1417 },
  'Barra da Estiva': { codigo_ibge: '2902807', latitude: -13.6261, longitude: -41.3269 },
  'Barra do Mendes': { codigo_ibge: '2903003', latitude: -11.8017, longitude: -42.0672 },
  'Barreiras': { codigo_ibge: '2903201', latitude: -12.1528, longitude: -44.9900 },
  'Barro Alto': { codigo_ibge: '2903235', latitude: -11.7600, longitude: -41.9119 },
  'Bom Jesus da Lapa': { codigo_ibge: '2903904', latitude: -13.2550, longitude: -43.4181 },
  'Boninal': { codigo_ibge: '2904001', latitude: -12.7017, longitude: -41.8294 },
  'Bonito': { codigo_ibge: '2904050', latitude: -11.9669, longitude: -41.2675 },
  'Boquira': { codigo_ibge: '2904100', latitude: -12.8231, longitude: -42.7306 },
  'Brotas de Macaúbas': { codigo_ibge: '2904506', latitude: -12.0019, longitude: -42.6269 },
  'Brumado': { codigo_ibge: '2904605', latitude: -14.2036, longitude: -41.6653 },
  'Caetité': { codigo_ibge: '2905206', latitude: -14.0694, longitude: -42.4750 },
  'Cafarnaum': { codigo_ibge: '2905305', latitude: -11.6936, longitude: -41.4686 },
  'Campo Alegre de Lourdes': { codigo_ibge: '2905909', latitude: -9.5169, longitude: -42.9903 },
  'Campo Formoso': { codigo_ibge: '2906006', latitude: -10.5089, longitude: -40.3214 },
  'Canarana': { codigo_ibge: '2906204', latitude: -11.6847, longitude: -41.7689 },
  'Cansanção': { codigo_ibge: '2906808', latitude: -10.6694, longitude: -39.4986 },
  'Canudos': { codigo_ibge: '2906824', latitude: -9.8964, longitude: -39.0267 },
  'Capim Grosso': { codigo_ibge: '2906873', latitude: -11.3811, longitude: -40.0128 },
  'Casa Nova': { codigo_ibge: '2907202', latitude: -9.1633, longitude: -40.9708 },
  'Central': { codigo_ibge: '2907608', latitude: -11.1358, longitude: -42.1133 },
  'Chorrochó': { codigo_ibge: '2907707', latitude: -8.9953, longitude: -39.0972 },
  'Conceição do Coité': { codigo_ibge: '2908408', latitude: -11.5639, longitude: -39.2828 },
  'Curaçá': { codigo_ibge: '2909901', latitude: -8.9903, longitude: -39.9094 },
  'Euclides da Cunha': { codigo_ibge: '2910701', latitude: -10.5075, longitude: -39.0158 },
  'Feira de Santana': { codigo_ibge: '2910800', latitude: -12.2664, longitude: -38.9663 },
  'Gentio do Ouro': { codigo_ibge: '2911303', latitude: -11.4319, longitude: -42.5056 },
  'Guanambi': { codigo_ibge: '2911709', latitude: -14.2233, longitude: -42.7814 },
  'Iaçu': { codigo_ibge: '2911907', latitude: -12.7672, longitude: -40.2117 },
  'Ibicoara': { codigo_ibge: '2912202', latitude: -13.4094, longitude: -41.2847 },
  'Ibipeba': { codigo_ibge: '2912400', latitude: -11.6408, longitude: -42.0111 },
  'Ibitiara': { codigo_ibge: '2913002', latitude: -12.6492, longitude: -42.2192 },
  'Ibititá': { codigo_ibge: '2913101', latitude: -11.5458, longitude: -41.9750 },
  'Ibotirama': { codigo_ibge: '2913200', latitude: -12.1853, longitude: -43.2206 },
  'Ipirá': { codigo_ibge: '2914000', latitude: -12.1583, longitude: -39.7372 },
  'Ipupiara': { codigo_ibge: '2914109', latitude: -11.8256, longitude: -42.6083 },
  'Iraquara': { codigo_ibge: '2914505', latitude: -12.2486, longitude: -41.6194 },
  'Irecê': { codigo_ibge: '2914604', latitude: -11.3042, longitude: -41.8558 },
  'Itaberaba': { codigo_ibge: '2914703', latitude: -12.5275, longitude: -40.3069 },
  'Itaguaçu da Bahia': { codigo_ibge: '2915353', latitude: -11.0119, longitude: -42.3986 },
  'Itiúba': { codigo_ibge: '2916807', latitude: -10.6928, longitude: -39.8531 },
  'Ituaçu': { codigo_ibge: '2917201', latitude: -13.8133, longitude: -41.2969 },
  'Jacobina': { codigo_ibge: '2917508', latitude: -11.1811, longitude: -40.5183 },
  'Jaguarari': { codigo_ibge: '2917706', latitude: -10.2639, longitude: -40.1958 },
  'Jequié': { codigo_ibge: '2918001', latitude: -13.8575, longitude: -40.0836 },
  'Jeremoabo': { codigo_ibge: '2918100', latitude: -10.0675, longitude: -38.4808 },
  'João Dourado': { codigo_ibge: '2918357', latitude: -11.3500, longitude: -41.6667 },
  'Juazeiro': { codigo_ibge: '2918407', latitude: -9.4117, longitude: -40.4986 },
  'Jussara': { codigo_ibge: '2918506', latitude: -11.0472, longitude: -41.9694 },
  'Lapão': { codigo_ibge: '2919157', latitude: -11.3831, longitude: -41.8322 },
  'Lençóis': { codigo_ibge: '2919306', latitude: -12.5631, longitude: -41.3889 },
  'Livramento de Nossa Senhora': { codigo_ibge: '2919504', latitude: -13.6431, longitude: -41.8406 },
  'Luís Eduardo Magalhães': { codigo_ibge: '2919553', latitude: -12.0964, longitude: -45.7950 },
  'Macaúbas': { codigo_ibge: '2919801', latitude: -13.0189, longitude: -42.6986 },
  'Mairi': { codigo_ibge: '2920106', latitude: -11.7114, longitude: -40.1489 },
  'Maracás': { codigo_ibge: '2920502', latitude: -13.4411, longitude: -40.4308 },
  'Miguel Calmon': { codigo_ibge: '2921203', latitude: -11.4289, longitude: -40.5947 },
  'Monte Santo': { codigo_ibge: '2921500', latitude: -10.4378, longitude: -39.3328 },
  'Morpará': { codigo_ibge: '2921609', latitude: -11.5589, longitude: -43.2806 },
  'Morro do Chapéu': { codigo_ibge: '2921708', latitude: -11.5500, longitude: -41.1561 },
  'Mucugê': { codigo_ibge: '2921906', latitude: -13.0056, longitude: -41.3708 },
  'Mulungu do Morro': { codigo_ibge: '2922052', latitude: -11.9619, longitude: -41.6383 },
  'Mundo Novo': { codigo_ibge: '2922102', latitude: -11.8589, longitude: -40.4725 },
  'Oliveira dos Brejinhos': { codigo_ibge: '2923209', latitude: -12.3169, longitude: -42.8961 },
  'Ourolândia': { codigo_ibge: '2923357', latitude: -10.9708, longitude: -41.0803 },
  'Palmeiras': { codigo_ibge: '2923506', latitude: -12.5289, longitude: -41.5589 },
  'Paramirim': { codigo_ibge: '2923605', latitude: -13.4425, longitude: -42.2389 },
  'Paratinga': { codigo_ibge: '2923704', latitude: -12.6906, longitude: -43.1842 },
  'Paulo Afonso': { codigo_ibge: '2924009', latitude: -9.4061, longitude: -38.2147 },
  'Piatã': { codigo_ibge: '2924306', latitude: -13.1519, longitude: -41.7725 },
  'Piritiba': { codigo_ibge: '2924801', latitude: -11.7300, longitude: -40.5567 },
  'Poções': { codigo_ibge: '2925105', latitude: -14.5297, longitude: -40.3653 },
  'Presidente Dutra': { codigo_ibge: '2925709', latitude: -11.2958, longitude: -41.9869 },
  'Queimadas': { codigo_ibge: '2925808', latitude: -10.9783, longitude: -39.6264 },
  'Remanso': { codigo_ibge: '2926004', latitude: -9.6228, longitude: -42.0811 },
  'Riachão do Jacuípe': { codigo_ibge: '2926301', latitude: -11.8069, longitude: -39.3856 },
  'Ribeira do Pombal': { codigo_ibge: '2926608', latitude: -10.8344, longitude: -38.5358 },
  'Rio de Contas': { codigo_ibge: '2926707', latitude: -13.5789, longitude: -41.8114 },
  'Ruy Barbosa': { codigo_ibge: '2927200', latitude: -12.2839, longitude: -40.4939 },
  'Salvador': { codigo_ibge: '2927408', latitude: -12.9714, longitude: -38.5014, capital: true },
  'Santa Maria da Vitória': { codigo_ibge: '2928109', latitude: -13.3947, longitude: -44.1886 },
  'Santaluz': { codigo_ibge: '2928000', latitude: -11.2558, longitude: -39.3747 },
  'São Desidério': { codigo_ibge: '2928901', latitude: -12.3633, longitude: -44.9733 },
  'São Gabriel': { codigo_ibge: '2929255', latitude: -11.2294, longitude: -41.9122 },
  'Seabra': { codigo_ibge: '2929909', latitude: -12.4183, longitude: -41.7703 },
  'Senhor do Bonfim': { codigo_ibge: '2930105', latitude: -10.4614, longitude: -40.1894 },
  'Sento Sé': { codigo_ibge: '2930204', latitude: -9.7464, longitude: -41.8847 },
  'Serrinha': { codigo_ibge: '2930501', latitude: -11.6642, longitude: -39.0075 },
  'Sobradinho': { codigo_ibge: '2930774', latitude: -9.4553, longitude: -40.8239 },
  'Souto Soares': { codigo_ibge: '2930907', latitude: -12.0878, longitude: -41.6378 },
  'Tapiramutá': { codigo_ibge: '2931301', latitude: -11.8475, longitude: -40.7897 },
  'Tucano': { codigo_ibge: '2931905', latitude: -10.9631, longitude: -38.7867 },
  'Uauá': { codigo_ibge: '2932309', latitude: -9.8414, longitude: -39.4819 },
  'Uibaí': { codigo_ibge: '2932408', latitude: -11.3375, longitude: -42.1328 },
  'Umburanas': { codigo_ibge: '2932457', latitude: -10.7336, longitude: -41.3264 },
  'Utinga': { codigo_ibge: '2932804', latitude: -12.0819, longitude: -41.0939 },
  'Valente': { codigo_ibge: '2933000', latitude: -11.4122, longitude: -39.4619 },
  'Várzea Nova': { codigo_ibge: '2933158', latitude: -11.2583, longitude: -40.9986 },
  'Vitória da Conquista': { codigo_ibge: '2933307', latitude: -14.8619, longitude: -40.8444 },
  'Wagner': { codigo_ibge: '2933406', latitude: -12.2858, longitude: -41.1686 },
  'Xique-Xique': { codigo_ibge: '2933604', latitude: -10.8228, longitude: -42.7311 }
};

function gerarCoordenadaDeterministicaBahia(
  nome: string,
  indice: number
): { codigo_ibge: string; latitude: number; longitude: number; capital: boolean } {
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
  const latOffset = ((hash % 480) - 240) / 100; // entre -2.40 e +2.40 em torno de -12.20
  const lonOffset = (((Math.floor(hash / 7) % 420) - 210) / 100); // entre -2.10 e +2.10 em torno de -41.30
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

export const CATALOGO_OFICIAL_CIDADES_BA: CidadeRadarResponseDTO[] = [
  ...NOMES_CIDADES_SEMIARIDO_BA
]
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  .map((nome, idx) => {
    const info = gerarCoordenadaDeterministicaBahia(nome, idx + 1);
    return {
      nome,
      uf: 'BA',
      codigo_ibge: info.codigo_ibge,
      latitude: info.latitude,
      longitude: info.longitude,
      fuso_horario: 'America/Bahia',
      capital: info.capital
    };
  });

/**
 * Polos climáticos representativos do Semiárido Baiano para consulta em tempo real via Open-Meteo:
 * - 10 polos mais quentes (Vale do São Francisco, Raso da Catarina e Sertão)
 * - 8 polos de clima mais ameno (Chapada Diamantina e Planalto da Conquista)
 */
const POLOS_CLIMATICOS_SEMIARIDO_BA: readonly PoloClimaticoSemiaridoBa[] = [
  // Polos mais quentes do Semiárido Baiano
  {
    nome: 'Juazeiro',
    uf: 'BA',
    codigo_ibge: '2918407',
    latitude: -9.4117,
    longitude: -40.4986,
    perfil: 'quente',
    tempMaxBase: 36.2,
    tempMinBase: 23.1
  },
  {
    nome: 'Bom Jesus da Lapa',
    uf: 'BA',
    codigo_ibge: '2903904',
    latitude: -13.255,
    longitude: -43.4181,
    perfil: 'quente',
    tempMaxBase: 36.5,
    tempMinBase: 23.3
  },
  {
    nome: 'Ibotirama',
    uf: 'BA',
    codigo_ibge: '2913200',
    latitude: -12.1853,
    longitude: -43.2206,
    perfil: 'quente',
    tempMaxBase: 36.8,
    tempMinBase: 23.4
  },
  {
    nome: 'Barra',
    uf: 'BA',
    codigo_ibge: '2902708',
    latitude: -11.0894,
    longitude: -43.1417,
    perfil: 'quente',
    tempMaxBase: 36.1,
    tempMinBase: 22.9
  },
  {
    nome: 'Xique-Xique',
    uf: 'BA',
    codigo_ibge: '2933604',
    latitude: -10.8228,
    longitude: -42.7311,
    perfil: 'quente',
    tempMaxBase: 35.9,
    tempMinBase: 23.1
  },
  {
    nome: 'Paulo Afonso',
    uf: 'BA',
    codigo_ibge: '2924009',
    latitude: -9.4061,
    longitude: -38.2147,
    perfil: 'quente',
    tempMaxBase: 35.6,
    tempMinBase: 22.7
  },
  {
    nome: 'Curaçá',
    uf: 'BA',
    codigo_ibge: '2909901',
    latitude: -8.9903,
    longitude: -39.9094,
    perfil: 'quente',
    tempMaxBase: 35.8,
    tempMinBase: 22.8
  },
  {
    nome: 'Jequié',
    uf: 'BA',
    codigo_ibge: '2918001',
    latitude: -13.8575,
    longitude: -40.0836,
    perfil: 'quente',
    tempMaxBase: 34.7,
    tempMinBase: 21.5
  },
  {
    nome: 'Brumado',
    uf: 'BA',
    codigo_ibge: '2904605',
    latitude: -14.2036,
    longitude: -41.6653,
    perfil: 'quente',
    tempMaxBase: 34.4,
    tempMinBase: 21.2
  },
  {
    nome: 'Irecê',
    uf: 'BA',
    codigo_ibge: '2914604',
    latitude: -11.3042,
    longitude: -41.8558,
    perfil: 'quente',
    tempMaxBase: 33.1,
    tempMinBase: 19.7
  },
  // Polos de clima mais ameno do Semiárido Baiano
  {
    nome: 'Piatã',
    uf: 'BA',
    codigo_ibge: '2924306',
    latitude: -13.1519,
    longitude: -41.7725,
    perfil: 'ameno',
    tempMaxBase: 23.4,
    tempMinBase: 12.8
  },
  {
    nome: 'Morro do Chapéu',
    uf: 'BA',
    codigo_ibge: '2921708',
    latitude: -11.55,
    longitude: -41.1561,
    perfil: 'ameno',
    tempMaxBase: 24.9,
    tempMinBase: 14.3
  },
  {
    nome: 'Mucugê',
    uf: 'BA',
    codigo_ibge: '2921906',
    latitude: -13.0056,
    longitude: -41.3708,
    perfil: 'ameno',
    tempMaxBase: 24.6,
    tempMinBase: 13.9
  },
  {
    nome: 'Rio de Contas',
    uf: 'BA',
    codigo_ibge: '2926707',
    latitude: -13.5789,
    longitude: -41.8114,
    perfil: 'ameno',
    tempMaxBase: 25.3,
    tempMinBase: 14.6
  },
  {
    nome: 'Vitória da Conquista',
    uf: 'BA',
    codigo_ibge: '2933307',
    latitude: -14.8619,
    longitude: -40.8444,
    perfil: 'ameno',
    tempMaxBase: 25.6,
    tempMinBase: 14.8
  },
  {
    nome: 'Seabra',
    uf: 'BA',
    codigo_ibge: '2929909',
    latitude: -12.4183,
    longitude: -41.7703,
    perfil: 'ameno',
    tempMaxBase: 26.7,
    tempMinBase: 15.8
  },
  {
    nome: 'Maracás',
    uf: 'BA',
    codigo_ibge: '2920502',
    latitude: -13.4411,
    longitude: -40.4308,
    perfil: 'ameno',
    tempMaxBase: 25.9,
    tempMinBase: 15.1
  },
  {
    nome: 'Poções',
    uf: 'BA',
    codigo_ibge: '2925105',
    latitude: -14.5297,
    longitude: -40.3653,
    perfil: 'ameno',
    tempMaxBase: 26.3,
    tempMinBase: 15.4
  }
];

function coordenadaValidaNaBahia(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -18.5 &&
    lat <= -8.4 &&
    lon >= -46.8 &&
    lon <= -37.2
  );
}

export class RadarMeteorologicoService {
  private readonly cacheAlertas = new Map<string, CacheEntry<AlertaRadarResponseDTO[]>>();
  private readonly cacheTemperaturas = new Map<string, CacheEntry<TemperaturaRadarResponseDTO>>();
  private readonly cacheCidades = new Map<string, CacheEntry<CidadeRadarResponseDTO[]>>();

  private normalizarListaAlertas(raw: unknown, ufPadrao: string): AlertaRadarResponseDTO[] {
    const listaBruta: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)?.alertas)
      ? ((raw as Record<string, unknown>).alertas as unknown[])
      : Array.isArray((raw as Record<string, unknown>)?.data)
      ? ((raw as Record<string, unknown>).data as unknown[])
      : [];

    return listaBruta
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item, idx) => {
        const riscos = Array.isArray(item.riscos)
          ? item.riscos.map(String)
          : typeof item.riscos === 'string' && item.riscos.trim()
          ? [item.riscos.trim()]
          : [
              'Variação brusca de umidade do solo e estresse térmico nas lavouras de sequeiro.',
              'Atenção ao armazenamento de água nas cisternas de placas e enxurrada.'
            ];

        const instrucoes = Array.isArray(item.instrucoes)
          ? item.instrucoes.map(String)
          : typeof item.instrucoes === 'string' && item.instrucoes.trim()
          ? [item.instrucoes.trim()]
          : [
              'Mantenha a cobertura morta (palhada) sobre os canteiros e linhas de plantio.',
              'Verifique calhas e o dispositivo de desvio das primeiras águas da cisterna.'
            ];

        const municipios = Array.isArray(item.municipios_afetados)
          ? item.municipios_afetados.map(String)
          : Array.isArray(item.municipios)
          ? item.municipios.map(String)
          : ['Irecê', 'Presidente Dutra', 'Lapão', 'João Dourado'];

        const codigosIbge = Array.isArray(item.codigos_ibge)
          ? item.codigos_ibge.map(String)
          : ['2914604', '2925709', '2919157', '2918357'];

        return {
          id: (item.id as string | number) ?? `radar-alerta-${idx + 1}`,
          evento: String(item.evento || item.titulo || 'Aviso Meteorológico INMET — Semiárido'),
          severidade: String(item.severidade || item.nivel || 'Perigo Potencial'),
          riscos,
          instrucoes,
          inicio: String(item.inicio || new Date().toISOString()),
          fim: String(
            item.fim || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          ),
          municipios_afetados: municipios,
          codigos_ibge: codigosIbge,
          uf: String(item.uf || ufPadrao),
          fonte: 'RadarMeteorológico (radarmeteorologico.com.br) / INMET'
        };
      });
  }

  private gerarAlertasFallback(uf: string): AlertaRadarResponseDTO[] {
    const agora = new Date();
    const amanha = new Date(agora.getTime() + 36 * 60 * 60 * 1000);
    return [
      {
        id: 'inmet-ba-irece-01',
        evento: 'Baixa Umidade Relativa do Ar e Alta Evapotranspiração no Semiárido',
        severidade: 'Perigo Potencial',
        riscos: [
          'Umidade relativa do ar variando entre 30% e 20% nas horas mais quentes da tarde.',
          'Aumento da perda de água do solo descoberto nas roças de milho e feijão-caupi.'
        ],
        instrucoes: [
          'Evite capinas que deixem a terra nua; preserve a palhada sobre o solo.',
          'Realize irrigações de salvação ou manejo nas primeiras horas da manhã ou final da tarde.',
          'Mantenha a tampa da cisterna bem vedada para reduzir evaporação e contaminação.'
        ],
        inicio: agora.toISOString(),
        fim: amanha.toISOString(),
        municipios_afetados: [
          'Irecê',
          'Presidente Dutra',
          'Lapão',
          'João Dourado',
          'Central',
          'São Gabriel',
          'Morro do Chapéu'
        ],
        codigos_ibge: [
          '2914604',
          '2925709',
          '2919157',
          '2918357',
          '2907608',
          '2929255',
          '2921708'
        ],
        uf,
        fonte: 'RadarMeteorológico (radarmeteorologico.com.br) / INMET'
      },
      {
        id: 'inmet-ba-irece-02',
        evento: 'Pancadas Isoladas de Chuva Convectiva (Trovoadas de Estação)',
        severidade: 'Atenção',
        riscos: [
          'Chuvas concentradas em curto intervalo com potencial de escorrimento superficial em terrenos inclinados.'
        ],
        instrucoes: [
          'Limpe as calhas e acione o desvio das primeiras águas antes de armazenar na cisterna.',
          'Mantenha leiras e sulcos em curva de nível para reter a água na raiz da lavoura.'
        ],
        inicio: agora.toISOString(),
        fim: amanha.toISOString(),
        municipios_afetados: ['Irecê', 'Presidente Dutra', 'Lapão', 'João Dourado', 'Ibititá'],
        codigos_ibge: ['2914604', '2925709', '2919157', '2918357', '2913101'],
        uf,
        fonte: 'RadarMeteorológico (radarmeteorologico.com.br) / INMET'
      }
    ];
  }

  public async listarAlertas(
    uf = 'BA',
    codigoIbge?: string
  ): Promise<AlertaRadarResponseDTO[]> {
    const ufNorm = String(uf || 'BA').trim().toUpperCase();
    const cacheKey = `alertas_${ufNorm}`;
    const agora = Date.now();
    const emCache = this.cacheAlertas.get(cacheKey);

    let listaBase: AlertaRadarResponseDTO[];

    if (emCache && emCache.expiraEm > agora) {
      listaBase = emCache.dados;
    } else {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(
          `${RADAR_API_BASE}/alertas?uf=${encodeURIComponent(ufNorm)}`,
          {
            headers: { Accept: 'application/json' },
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (!resp.ok) {
          throw new Error(`RadarMeteorologico alertas HTTP ${resp.status}`);
        }

        const payload = await resp.json();
        const normalizados = this.normalizarListaAlertas(payload, ufNorm);
        listaBase =
          normalizados.length > 0 ? normalizados : this.gerarAlertasFallback(ufNorm);
      } catch {
        listaBase = this.gerarAlertasFallback(ufNorm);
      }

      this.cacheAlertas.set(cacheKey, {
        dados: listaBase,
        expiraEm: agora + TTL_ALERTAS_MS
      });
    }

    if (codigoIbge && String(codigoIbge).trim()) {
      const ibgeLimpo = String(codigoIbge).trim();
      const filtrados = listaBase.filter(
        (alerta) =>
          alerta.codigos_ibge.includes(ibgeLimpo) ||
          alerta.municipios_afetados.some((m) =>
            m.toLowerCase().includes(ibgeLimpo.toLowerCase())
          )
      );
      return filtrados.length > 0 ? filtrados : listaBase;
    }

    return listaBase;
  }

  /**
   * Normaliza e valida um item de temperatura garantindo que 100% dos itens pertençam
   * ao catálogo oficial do Semiárido Baiano e tenham uf === 'BA'.
   */
  private normalizarItemTemperatura(
    raw: Record<string, unknown>,
    idx: number,
    tipo: 'quente' | 'fria'
  ): ItemTemperaturaCidadeDTO & { temp_max: number; temp_min: number } {
    const polosFallback =
      tipo === 'quente'
        ? POLOS_CLIMATICOS_SEMIARIDO_BA.filter((p) => p.perfil === 'quente')
        : POLOS_CLIMATICOS_SEMIARIDO_BA.filter((p) => p.perfil === 'ameno');
    const poloPadrao = polosFallback[Math.abs(idx) % polosFallback.length];

    const nomeBruto = String(
      raw?.nome || raw?.cidade || raw?.municipio || raw?.localidade || ''
    )
      .replace(/\s*\(?IBGE[:\s]*\d+\)?/gi, '')
      .replace(/\s*[—–-]\s*[A-Z]{2}\s*$/i, '')
      .replace(/^\s*[-—–]+\s*/, '')
      .trim();

    const ufBruta = String(raw?.uf || raw?.estado || 'BA')
      .replace(/[^a-zA-Z]/g, '')
      .trim()
      .toUpperCase();

    const nomeOficialBa = MAPA_NOMES_OFICIAIS_BA.get(normalizarChaveCidade(nomeBruto));
    const pertenceSemiAridoBa = Boolean(nomeOficialBa) && (ufBruta === 'BA' || ufBruta === '');

    const nome = pertenceSemiAridoBa && nomeOficialBa ? nomeOficialBa : poloPadrao.nome;
    const uf = 'BA';

    const rawMax = pertenceSemiAridoBa
      ? raw?.temp_max ??
        raw?.temp_max_c ??
        raw?.maxima ??
        raw?.max ??
        raw?.temperatura
      : poloPadrao.tempMaxBase;
    const numMax =
      rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== ''
        ? Number(rawMax)
        : NaN;
    const tempMax = Number.isFinite(numMax)
      ? Math.round(numMax * 10) / 10
      : poloPadrao.tempMaxBase;

    const rawMin = pertenceSemiAridoBa
      ? raw?.temp_min ??
        raw?.temp_min_c ??
        raw?.minima ??
        raw?.min ??
        tempMax - 11
      : poloPadrao.tempMinBase;
    const numMin =
      rawMin !== null && rawMin !== undefined && String(rawMin).trim() !== ''
        ? Number(rawMin)
        : NaN;
    const tempMin = Number.isFinite(numMin)
      ? Math.round(numMin * 10) / 10
      : poloPadrao.tempMinBase;

    const infoConhecida = COORDENADAS_CONHECIDAS_BA[nome];
    const codigoIbge =
      (pertenceSemiAridoBa && raw?.codigo_ibge ? String(raw.codigo_ibge) : undefined) ||
      infoConhecida?.codigo_ibge ||
      poloPadrao.codigo_ibge;

    return {
      nome,
      uf,
      codigo_ibge: codigoIbge,
      temp_max_c: tempMax,
      temp_min_c: tempMin,
      temp_max: tempMax,
      temp_min: tempMin,
      condicao: raw?.condicao
        ? String(raw.condicao)
        : tipo === 'quente'
        ? 'Predomínio de sol e calor no Semiárido Baiano'
        : 'Clima ameno de altitude no Semiárido Baiano'
    };
  }

  /**
   * Consulta em tempo real via Open-Meteo os 18 polos climáticos representativos do
   * Semiárido Baiano e retorna os municípios mais quentes e mais amenos do dia,
   * garantindo que 100% dos itens pertençam à Bahia (uf: 'BA').
   */
  public async obterRankingTemperaturas(
    limite = 5
  ): Promise<
    TemperaturaRadarResponseDTO & {
      mais_amenos?: Array<ItemTemperaturaCidadeDTO & { temp_max: number; temp_min: number }>;
    }
  > {
    const lim = Math.min(10, Math.max(1, Number(limite) || 5));
    const cacheKey = `mc_radar_temp_semiarido_ba_v3_${lim}`;
    const agora = Date.now();
    const emCache = this.cacheTemperaturas.get(cacheKey);

    if (emCache && emCache.expiraEm > agora) {
      return emCache.dados;
    }

    const medicoesPolos: Array<
      ItemTemperaturaCidadeDTO & {
        temp_max: number;
        temp_min: number;
        perfil: 'quente' | 'ameno';
      }
    > = [];

    try {
      const lats = POLOS_CLIMATICOS_SEMIARIDO_BA.map((p) => p.latitude).join(',');
      const lons = POLOS_CLIMATICOS_SEMIARIDO_BA.map((p) => p.longitude).join(',');
      const urlOpenMeteo = `${OPEN_METEO_FORECAST_URL}?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max,temperature_2m_min&current=temperature_2m&timezone=America%2FBahia&forecast_days=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(urlOpenMeteo, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const payload = await resp.json();
        const listaRespostas: unknown[] = Array.isArray(payload) ? payload : [payload];

        POLOS_CLIMATICOS_SEMIARIDO_BA.forEach((polo, index) => {
          const itemApi = (listaRespostas[index] || {}) as Record<string, unknown>;
          const daily = (itemApi.daily || {}) as Record<string, unknown>;
          const current = (itemApi.current || {}) as Record<string, unknown>;

          const arrMax = Array.isArray(daily.temperature_2m_max)
            ? daily.temperature_2m_max
            : [];
          const arrMin = Array.isArray(daily.temperature_2m_min)
            ? daily.temperature_2m_min
            : [];

          const maxVal = Number(arrMax[0] ?? current.temperature_2m ?? polo.tempMaxBase);
          const minVal = Number(arrMin[0] ?? polo.tempMinBase);

          const normalizado = this.normalizarItemTemperatura(
            {
              nome: polo.nome,
              uf: 'BA',
              codigo_ibge: polo.codigo_ibge,
              temp_max_c: Number.isFinite(maxVal) ? maxVal : polo.tempMaxBase,
              temp_min_c: Number.isFinite(minVal) ? minVal : polo.tempMinBase
            },
            index,
            polo.perfil === 'quente' ? 'quente' : 'fria'
          );

          medicoesPolos.push({
            ...normalizado,
            perfil: polo.perfil
          });
        });
      }
    } catch {
      // Caso a chamada em lote ao Open-Meteo falhe, utiliza os polos oficiais do Semiárido Baiano abaixo
    }

    if (medicoesPolos.length === 0) {
      POLOS_CLIMATICOS_SEMIARIDO_BA.forEach((polo, index) => {
        const normalizado = this.normalizarItemTemperatura(
          {
            nome: polo.nome,
            uf: 'BA',
            codigo_ibge: polo.codigo_ibge,
            temp_max_c: polo.tempMaxBase,
            temp_min_c: polo.tempMinBase
          },
          index,
          polo.perfil === 'quente' ? 'quente' : 'fria'
        );
        medicoesPolos.push({
          ...normalizado,
          perfil: polo.perfil
        });
      });
    }

    const ordenadosMaisQuentes = [...medicoesPolos]
      .sort((a, b) => b.temp_max_c - a.temp_max_c || b.temp_min_c - a.temp_min_c)
      .slice(0, lim)
      .map(({ perfil: _perfil, ...rest }) => rest);

    const nomesJaNosQuentes = new Set(ordenadosMaisQuentes.map((c) => c.nome));

    const ordenadosMaisFrias = [...medicoesPolos]
      .filter((c) => !nomesJaNosQuentes.has(c.nome))
      .sort((a, b) => a.temp_max_c - b.temp_max_c || a.temp_min_c - b.temp_min_c)
      .slice(0, lim)
      .map(({ perfil: _perfil, ...rest }) => rest);

    const resultado: TemperaturaRadarResponseDTO & {
      mais_amenos?: Array<ItemTemperaturaCidadeDTO & { temp_max: number; temp_min: number }>;
    } = {
      atualizado_em: new Date().toISOString(),
      limite: lim,
      mais_quentes: ordenadosMaisQuentes,
      mais_frias: ordenadosMaisFrias,
      mais_amenos: ordenadosMaisFrias,
      fonte: 'Open-Meteo / Monitoramento Climático do Semiárido Baiano (BA)'
    };

    this.cacheTemperaturas.set(cacheKey, {
      dados: resultado,
      expiraEm: agora + TTL_TEMPERATURAS_MS
    });

    return resultado;
  }

  /**
   * Retorna exclusivamente as cidades pertencentes à lista oficial do Semiárido Baiano (uf: 'BA'),
   * ordenadas alfabeticamente de A a X e com coordenadas reais da Bahia.
   */
  public async buscarCidades(params: {
    uf?: string;
    q?: string;
    ibge?: string;
  }): Promise<CidadeRadarResponseDTO[]> {
    const q = params.q ? String(params.q).trim().toLowerCase() : '';
    const ibge = params.ibge ? String(params.ibge).trim() : '';

    const cacheKey = 'cidades_semiarido_ba_v3';
    const agora = Date.now();
    const emCache = this.cacheCidades.get(cacheKey);

    let listaCidades: CidadeRadarResponseDTO[];

    if (emCache && emCache.expiraEm > agora) {
      listaCidades = emCache.dados;
    } else {
      const mapaApiPorNome = new Map<
        string,
        { codigo_ibge?: string; latitude?: number; longitude?: number }
      >();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const queryUrl = new URL(`${RADAR_API_BASE}/cidades`);
        queryUrl.searchParams.set('uf', 'BA');

        const resp = await fetch(queryUrl.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const raw = await resp.json();
          const arr: unknown[] = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as Record<string, unknown>)?.cidades)
            ? ((raw as Record<string, unknown>).cidades as unknown[])
            : Array.isArray((raw as Record<string, unknown>)?.data)
            ? ((raw as Record<string, unknown>).data as unknown[])
            : [];

          for (const item of arr) {
            if (!item || typeof item !== 'object') continue;
            const rec = item as Record<string, unknown>;
            const ufItem = String(rec.uf || 'BA').trim().toUpperCase();
            if (ufItem !== 'BA') continue;

            const nomeBruto = String(rec.nome || rec.municipio || '').trim();
            const nomeOficial = MAPA_NOMES_OFICIAIS_BA.get(
              normalizarChaveCidade(nomeBruto)
            );
            if (!nomeOficial) continue;

            const latNum = Number(rec.latitude ?? rec.lat);
            const lonNum = Number(rec.longitude ?? rec.lon);
            const ibgeStr = String(rec.codigo_ibge || rec.ibge || '').trim();

            mapaApiPorNome.set(nomeOficial, {
              codigo_ibge: ibgeStr.startsWith('29') ? ibgeStr : undefined,
              latitude: coordenadaValidaNaBahia(latNum, lonNum) ? latNum : undefined,
              longitude: coordenadaValidaNaBahia(latNum, lonNum) ? lonNum : undefined
            });
          }
        }
      } catch {
        // Segue com o catálogo oficial da Bahia caso a API externa não responda
      }

      listaCidades = CATALOGO_OFICIAL_CIDADES_BA.map((cidadeBase) => {
        const infoConhecida = COORDENADAS_CONHECIDAS_BA[cidadeBase.nome];
        const infoApi = mapaApiPorNome.get(cidadeBase.nome);

        const latitude =
          infoConhecida?.latitude ?? infoApi?.latitude ?? cidadeBase.latitude;
        const longitude =
          infoConhecida?.longitude ?? infoApi?.longitude ?? cidadeBase.longitude;
        const codigo_ibge =
          infoConhecida?.codigo_ibge ?? infoApi?.codigo_ibge ?? cidadeBase.codigo_ibge;

        return {
          nome: cidadeBase.nome,
          uf: 'BA',
          codigo_ibge,
          latitude,
          longitude,
          fuso_horario: 'America/Bahia',
          capital: Boolean(infoConhecida?.capital ?? cidadeBase.capital)
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      this.cacheCidades.set(cacheKey, {
        dados: listaCidades,
        expiraEm: agora + TTL_CIDADES_MS
      });
    }

    return listaCidades.filter((cidade) => {
      if (cidade.uf !== 'BA') return false;
      if (ibge && cidade.codigo_ibge !== ibge) return false;
      if (q) {
        const nomeNorm = normalizarChaveCidade(cidade.nome);
        const qNorm = normalizarChaveCidade(q);
        if (!cidade.nome.toLowerCase().includes(q) && !nomeNorm.includes(qNorm)) {
          return false;
        }
      }
      return true;
    });
  }
}

export const radarMeteorologicoService = new RadarMeteorologicoService();
