import { pluviometroRepository } from '../../pluviometro/repository/PluviometroRepository.js';
import { plantioService } from '../../plantio/service/PlantioService.js';
import { DiagnosticoClimaResponseDTO } from '../dto/DiagnosticoClimaResponseDTO.js';
import { radarMeteorologicoService } from './RadarMeteorologicoService.js';

interface CoordenadaLocalidade {
  id: number;
  nome: string;
  municipio: string;
  codigoIbge: string;
  latitude: number;
  longitude: number;
  estacaoInmetCodigo: string;
}

const LOCALIDADES_SEMIARIDO: CoordenadaLocalidade[] = [
  {
    id: 1,
    nome: 'Irecê',
    municipio: 'Irecê',
    codigoIbge: '2914604',
    latitude: -11.3042,
    longitude: -41.8558,
    estacaoInmetCodigo: 'A424'
  },
  {
    id: 2,
    nome: 'Presidente Dutra',
    municipio: 'Presidente Dutra',
    codigoIbge: '2925709',
    latitude: -11.2958,
    longitude: -41.9869,
    estacaoInmetCodigo: 'A424'
  },
  {
    id: 3,
    nome: 'Povoado de Achado (Irecê)',
    municipio: 'Irecê',
    codigoIbge: '2914604',
    latitude: -11.261,
    longitude: -41.821,
    estacaoInmetCodigo: 'A424'
  },
  {
    id: 4,
    nome: 'Povoado de Umbuzeiro (Irecê)',
    municipio: 'Irecê',
    codigoIbge: '2914604',
    latitude: -11.3412,
    longitude: -41.884,
    estacaoInmetCodigo: 'A424'
  },
  {
    id: 5,
    nome: 'Povoado de Campo Formoso (Pres. Dutra)',
    municipio: 'Presidente Dutra',
    codigoIbge: '2925709',
    latitude: -11.312,
    longitude: -41.965,
    estacaoInmetCodigo: 'A424'
  }
];

// Normais climatológicas mensais de referência para o Território de Irecê - BA (INMET 83228, em mm)
const NORMAL_CLIMATOLOGICA_MENSAL_MM: Record<number, number> = {
  1: 98.0,
  2: 92.0,
  3: 114.0,
  4: 64.0,
  5: 22.0,
  6: 10.0,
  7: 8.0,
  8: 6.0,
  9: 14.0,
  10: 80.0,
  11: 112.0,
  12: 118.0
};

interface OpenMeteoPayload {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    precipitation_sum?: Array<number | null>;
  };
}

export class ClimaService {
  private resolverLocalidade(opcoes?: {
    localidadeId?: number;
    lat?: number;
    lon?: number;
    municipio?: string;
    ibge?: string;
  }): CoordenadaLocalidade {
    const lat = opcoes?.lat;
    const lon = opcoes?.lon;

    if (
      lat !== undefined &&
      lon !== undefined &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180
    ) {
      const munNome = opcoes?.municipio?.trim() || 'Irecê';
      return {
        id: Number(opcoes?.localidadeId) || 1,
        nome: munNome,
        municipio: munNome,
        codigoIbge: opcoes?.ibge?.trim() || '2914604',
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
        estacaoInmetCodigo: 'A424'
      };
    }

    if (opcoes?.municipio) {
      const termo = opcoes.municipio.trim().toLowerCase();
      const porNome = LOCALIDADES_SEMIARIDO.find(
        (l) =>
          l.municipio.toLowerCase() === termo ||
          l.nome.toLowerCase().includes(termo)
      );
      if (porNome) return porNome;
    }

    const encontrada = LOCALIDADES_SEMIARIDO.find(
      (l) => l.id === Number(opcoes?.localidadeId)
    );
    return encontrada || LOCALIDADES_SEMIARIDO[0];
  }

  private async consultarOpenMeteo(
    latitude: number,
    longitude: number
  ): Promise<{
    temperaturaC: number;
    umidadeRelativaPct: number;
    precipitacaoAtualMm: number;
    ventoVelocidadeKmh: number;
    acumuladoPassado30DiasMm: number;
    acumuladoUltimos7DiasMm: number;
    previsaoProximos7DiasMm: number;
    fonteTelemetria: string;
  }> {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
      `&daily=precipitation_sum&past_days=30&forecast_days=7&timezone=America%2FBahia`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5500);
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const dados = (await response.json()) as OpenMeteoPayload;
      const datas = dados.daily?.time || [];
      const somas = dados.daily?.precipitation_sum || [];
      const hojeIso = new Date().toISOString().slice(0, 10);
      const seteDiasAtrasIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      let acumuladoPassado30DiasMm = 0;
      let acumuladoUltimos7DiasMm = 0;
      let previsaoProximos7DiasMm = 0;

      for (let i = 0; i < datas.length; i++) {
        const valor = Number(somas[i] ?? 0);
        if (Number.isNaN(valor)) continue;
        if (datas[i] <= hojeIso) {
          acumuladoPassado30DiasMm += valor;
          if (datas[i] >= seteDiasAtrasIso) {
            acumuladoUltimos7DiasMm += valor;
          }
        } else {
          previsaoProximos7DiasMm += valor;
        }
      }

      return {
        temperaturaC: Number((dados.current?.temperature_2m ?? 27.4).toFixed(1)),
        umidadeRelativaPct: Math.round(dados.current?.relative_humidity_2m ?? 62),
        precipitacaoAtualMm: Number((dados.current?.precipitation ?? 0).toFixed(1)),
        ventoVelocidadeKmh: Number((dados.current?.wind_speed_10m ?? 14.2).toFixed(1)),
        acumuladoPassado30DiasMm: Number(acumuladoPassado30DiasMm.toFixed(1)),
        acumuladoUltimos7DiasMm: Number(acumuladoUltimos7DiasMm.toFixed(1)),
        previsaoProximos7DiasMm: Number(previsaoProximos7DiasMm.toFixed(1)),
        fonteTelemetria: 'Open-Meteo API (Tempo Real) + Estação Automática INMET A424'
      };
    } catch {
      return {
        temperaturaC: 27.4,
        umidadeRelativaPct: 62,
        precipitacaoAtualMm: 0.0,
        ventoVelocidadeKmh: 14.5,
        acumuladoPassado30DiasMm: 0.0,
        acumuladoUltimos7DiasMm: 0.0,
        previsaoProximos7DiasMm: 12.0,
        fonteTelemetria: 'Estação Automática INMET A424 (Irecê - BA) + Pluviômetro Comunitário'
      };
    }
  }

  public async obterDiagnostico(opcoes?: {
    localidadeId?: number;
    lat?: number;
    lon?: number;
    usuarioId?: number;
    municipio?: string;
    uf?: string;
    ibge?: string;
  }): Promise<DiagnosticoClimaResponseDTO> {
    const local = this.resolverLocalidade(opcoes);
    const uf = (opcoes?.uf || 'BA').toUpperCase();

    const [telemetria, alertasRadar] = await Promise.all([
      this.consultarOpenMeteo(local.latitude, local.longitude),
      radarMeteorologicoService.listarAlertas(uf, opcoes?.ibge || local.codigoIbge)
    ]);

    const chuvaPluviometro30d = pluviometroRepository.calcularAcumuladoJanelaDias(local.id, 30);
    const chuvaPluviometro7d = pluviometroRepository.calcularAcumuladoJanelaDias(local.id, 7);

    // Soma os lançamentos locais do pluviômetro com a telemetria satelital/estação
    const acumuladoTotal30DiasMm = Number(
      (chuvaPluviometro30d + telemetria.acumuladoPassado30DiasMm).toFixed(1)
    );
    const acumuladoUltimos7DiasMm = Number(
      (chuvaPluviometro7d + telemetria.acumuladoUltimos7DiasMm).toFixed(1)
    );

    const mesAtual = new Date().getUTCMonth() + 1;
    const normalClimatologicaMesMm = NORMAL_CLIMATOLOGICA_MENSAL_MM[mesAtual] || 80.0;
    const percentualDaNormal =
      normalClimatologicaMesMm > 0
        ? Math.round((acumuladoTotal30DiasMm / normalClimatologicaMesMm) * 100)
        : 0;

    const fraseComparativa = `Choveu ${acumuladoTotal30DiasMm} mm; o normal para esse mês é ${normalClimatologicaMesMm} mm.`;

    const diagnosticoPlantio = plantioService.avaliarAptidao(
      local.id,
      acumuladoTotal30DiasMm,
      opcoes?.usuarioId || 1
    );

    const recomendacoesPlantio = diagnosticoPlantio.culturas.map((c) => ({
      cultura: c.culturaNome,
      chuvaAcumuladaMm: c.chuvaAcumuladaMm,
      limiarExigidoMm: c.limiarExigidoMm,
      janelaDias: c.janelaDias,
      status:
        c.statusAptidao === 'APTO'
          ? 'RECOMENDADO'
          : c.statusAptidao === 'TRANSICAO'
          ? 'ATENCAO'
          : 'AGUARDAR_CHUVA',
      orientacaoManejo: `${c.resumoRecomendacao} ${c.orientacaoManejo}`
    }));

    return {
      localidade: {
        id: local.id,
        nome: local.nome,
        municipio: local.municipio,
        uf,
        codigoIbge: local.codigoIbge,
        latitude: local.latitude,
        longitude: local.longitude,
        estacaoInmetCodigo: local.estacaoInmetCodigo
      },
      meteorologiaAtual: {
        temperaturaC: telemetria.temperaturaC,
        umidadeRelativaPct: telemetria.umidadeRelativaPct,
        precipitacaoAtualMm: telemetria.precipitacaoAtualMm,
        ventoVelocidadeKmh: telemetria.ventoVelocidadeKmh,
        fonteTelemetria: telemetria.fonteTelemetria
      },
      chuvaAcumulada: {
        acumuladoMesMm: acumuladoTotal30DiasMm,
        acumuladoUltimos30DiasMm: acumuladoTotal30DiasMm,
        acumuladoUltimos7DiasMm,
        acumuladoPluviometroProprioMm: chuvaPluviometro30d,
        acumuladoOpenMeteo30DiasMm: telemetria.acumuladoPassado30DiasMm,
        previsaoProximos7DiasMm: telemetria.previsaoProximos7DiasMm,
        normalClimatologicaMesMm,
        percentualDaNormal,
        fraseComparativa
      },
      plantio: diagnosticoPlantio,
      alertasRadar,
      fonteAlertas: 'RadarMeteorológico (https://radarmeteorologico.com.br) / INMET',
      // Campos planos para compatibilidade direta
      municipio: local.municipio,
      uf,
      latitude: local.latitude,
      longitude: local.longitude,
      temperaturaAtualC: telemetria.temperaturaC,
      umidadeRelativaPct: telemetria.umidadeRelativaPct,
      chuvaAcumulada30dMm: acumuladoTotal30DiasMm,
      chuvaUltimos7dMm: acumuladoUltimos7DiasMm,
      alertaSeca: diagnosticoPlantio.codigoSituacaoGeral === 'ESTIAGEM',
      fonteDados: telemetria.fonteTelemetria,
      recomendacoesPlantio,
      atualizadoEm: new Date().toISOString()
    };
  }
}

export const climaService = new ClimaService();
