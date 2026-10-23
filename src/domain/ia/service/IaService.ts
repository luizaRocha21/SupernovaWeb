import { GoogleGenAI } from '@google/genai';
import { BusinessException } from '../../../infrastructure/exception/BusinessException.js';
import { climaService } from '../../clima/service/ClimaService.js';
import { radarMeteorologicoService } from '../../clima/service/RadarMeteorologicoService.js';
import {
  ChatIaRequestDTO,
  ChatIaResponseDTO,
  ResumoVozRequestDTO,
  ResumoVozResponseDTO
} from '../dto/ChatIaDTO.js';

export class IaService {
  private criarClienteGemini(): GoogleGenAI | null {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  private async consultarGeminiFreeTier(
    systemInstruction: string,
    promptUsuario: string
  ): Promise<string | null> {
    const ai = this.criarClienteGemini();
    if (!ai) return null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptUsuario,
        config: {
          systemInstruction,
          temperature: 0.4
        }
      });
      const texto = response.text?.trim();
      return texto && texto.length > 10 ? texto : null;
    } catch {
      return null;
    }
  }

  private async consultarPollinationsFreeApi(
    systemInstruction: string,
    promptUsuario: string
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: promptUsuario }
          ],
          temperature: 0.4
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const texto = data.choices?.[0]?.message?.content?.trim();
        return texto && texto.length > 10 ? texto : null;
      }

      const rawText = (await response.text()).trim();
      return rawText.length > 10 ? rawText : null;
    } catch {
      return null;
    }
  }

  public async responderChat(
    dto: ChatIaRequestDTO & { mensagem?: string; municipio?: string; uf?: string; ibge?: string }
  ): Promise<ChatIaResponseDTO> {
    const pergunta = (dto.pergunta || dto.mensagem || '').trim();
    if (!pergunta) {
      throw new BusinessException(
        'Digite ou fale sua dúvida sobre plantio, chuva ou manejo hídrico.',
        400,
        'PERGUNTA_OBRIGATORIA'
      );
    }

    const [diag, rankingTemp] = await Promise.all([
      climaService.obterDiagnostico({
        localidadeId: dto.localidadeId,
        lat: dto.lat,
        lon: dto.lon,
        municipio: dto.municipio,
        uf: dto.uf,
        ibge: dto.ibge
      }),
      radarMeteorologicoService.obterRankingTemperaturas(5)
    ]);

    const codigoIbgeLocal = dto.ibge || diag.localidade.codigoIbge || '2914604';
    const alertasRadar =
      diag.alertasRadar && diag.alertasRadar.length > 0
        ? diag.alertasRadar
        : await radarMeteorologicoService.listarAlertas(diag.localidade.uf || 'BA', codigoIbgeLocal);

    const resumoAlertasRadar =
      alertasRadar.length > 0
        ? alertasRadar
            .slice(0, 3)
            .map(
              (a) =>
                `${a.evento} (Severidade: ${a.severidade} | Riscos: ${(a.riscos || []).join('; ')} | Instruções: ${(a.instrucoes || []).join('; ')})`
            )
            .join(' || ')
        : 'Sem alertas severos extraordinários no momento.';

    const resumoExtremosTermicos = [
      ...(rankingTemp.mais_quentes || [])
        .slice(0, 3)
        .map((c) => `${c.nome}-${c.uf}: máx ${c.temp_max_c}°C / mín ${c.temp_min_c}°C`),
      ...(rankingTemp.mais_frias || [])
        .slice(0, 2)
        .map((c) => `${c.nome}-${c.uf}: mín ${c.temp_min_c}°C / máx ${c.temp_max_c}°C`)
    ].join(', ');

    const resumoCulturas = diag.plantio.culturas
      .map(
        (c) =>
          `${c.nome}: ${c.statusAptidao} (observado ${c.precipitacaoObservadaMm} mm vs limiar ${c.limiarAtivoMm} mm em ${c.janelaDias} dias)`
      )
      .join(' | ');

    const systemInstruction =
      `Você é o Assistente Agronômico Oficial do aplicativo Manejo Caatingueiro (SupernovaWeb), ` +
      `especializado em agricultura familiar de sequeiro no semiárido da Bahia (Território de Irecê e Presidente Dutra). ` +
      `Responda sempre em português claro, acolhedor, direto (máximo de 3 parágrafos curtos) e fundamentado nos dados reais abaixo:\n` +
      `- Localidade: ${diag.localidade.nome} (${diag.localidade.municipio}-${diag.localidade.uf}, IBGE ${codigoIbgeLocal})\n` +
      `- Telemetria atual (${diag.meteorologiaAtual.fonteTelemetria}): Temperatura ${diag.meteorologiaAtual.temperaturaC} °C, Umidade ${diag.meteorologiaAtual.umidadeRelativaPct}%, Vento ${diag.meteorologiaAtual.ventoVelocidadeKmh} km/h\n` +
      `- Chuva acumulada (30 dias): ${diag.chuvaAcumulada.acumuladoUltimos30DiasMm} mm (Últimos 7 dias: ${diag.chuvaAcumulada.acumuladoUltimos7DiasMm} mm | Normal histórica do mês: ${diag.chuvaAcumulada.normalClimatologicaMesMm} mm)\n` +
      `- Diagnóstico RN01–RN12 das culturas: ${resumoCulturas}\n` +
      `- Alertas oficiais ativos (RadarMeteorológico / INMET): ${resumoAlertasRadar}\n` +
      `- Extremos térmicos regionais do dia (RadarMeteorológico): ${resumoExtremosTermicos}\n` +
      `- Lembre sempre que a orientação é consultiva (RN12) e valoriza o conhecimento do agricultor.`;

    const historicoTexto = (dto.historico || [])
      .slice(-4)
      .map((h) => {
        const autor = (h as unknown as Record<string, string>).papel || (h as unknown as Record<string, string>).autor;
        return `${autor === 'usuario' ? 'Agricultor' : 'Assistente'}: ${h.texto}`;
      })
      .join('\n');

    const promptFinal = historicoTexto
      ? `Histórico recente:\n${historicoTexto}\n\nNova pergunta do agricultor (cultura foco: ${dto.cultura || 'geral'}): ${pergunta}`
      : `Pergunta do agricultor (cultura foco: ${dto.cultura || 'geral'}): ${pergunta}`;

    let provedor: ChatIaResponseDTO['provedor'] = 'GOOGLE_GEMINI_FREE_TIER';
    let resposta = await this.consultarGeminiFreeTier(systemInstruction, promptFinal);

    if (!resposta) {
      provedor = 'POLLINATIONS_OPENAI_FREE';
      resposta = await this.consultarPollinationsFreeApi(systemInstruction, promptFinal);
    }

    if (!resposta) {
      provedor = 'MOTOR_AGROCLIMATICO_CAATINGA';
      const alertaDestaque = alertasRadar[0]
        ? ` Alerta INMET vigente: ${alertasRadar[0].evento} (${alertasRadar[0].severidade}).`
        : '';
      resposta =
        `Em ${diag.localidade.nome} (IBGE ${codigoIbgeLocal}), registramos ${diag.chuvaAcumulada.acumuladoUltimos30DiasMm} mm nos últimos 30 dias ` +
        `(${diag.chuvaAcumulada.acumuladoUltimos7DiasMm} mm nos últimos 7 dias), com temperatura atual de ${diag.meteorologiaAtual.temperaturaC} °C ` +
        `e umidade relativa de ${diag.meteorologiaAtual.umidadeRelativaPct}%.${alertaDestaque} ` +
        `${diag.plantio.resumoConsultivo} Para Milho (limiar 120 mm), Feijão-Caupi (110 mm) e Mamona (90 mm), ` +
        `mantenha cobertura morta sobre o solo para reduzir a evaporação e confira a umidade a 15 cm de profundidade antes da semeadura.`;
    }

    return {
      resposta,
      provedor,
      contextoAgroclimatico: {
        localidade: diag.localidade.nome,
        temperaturaC: diag.meteorologiaAtual.temperaturaC,
        umidadeRelativaPct: diag.meteorologiaAtual.umidadeRelativaPct,
        chuvaAcumulada30DiasMm: diag.chuvaAcumulada.acumuladoUltimos30DiasMm,
        chuvaUltimos7DiasMm: diag.chuvaAcumulada.acumuladoUltimos7DiasMm,
        normalClimatologicaMesMm: diag.chuvaAcumulada.normalClimatologicaMesMm,
        statusGeralPlantio: diag.plantio.statusGeral,
        resumoConsultivo: diag.plantio.resumoConsultivo
      },
      geradoEm: new Date().toISOString()
    };
  }

  public async gerarResumoVoz(dto: ResumoVozRequestDTO): Promise<ResumoVozResponseDTO> {
    const diag = await climaService.obterDiagnostico({
      localidadeId: dto.localidadeId
    });

    const alertaResumo =
      diag.alertasRadar && diag.alertasRadar.length > 0
        ? `Atenção para aviso meteorológico: ${diag.alertasRadar[0].evento}.`
        : '';

    const systemInstruction =
      'Você gera resumos curtos em áudio (2 a 3 frases simples e naturais em português do Brasil) ' +
      'para leitura em voz alta a agricultores familiares do semiárido baiano. Não use markdown nem listas.';

    const prompt =
      `Gere um resumo falado curto para a página "${dto.pagina || 'painel principal'}" na localidade ${diag.localidade.nome}. ` +
      `Dados atuais: ${diag.chuvaAcumulada.fraseComparativa} Temperatura: ${diag.meteorologiaAtual.temperaturaC} graus, ` +
      `umidade ${diag.meteorologiaAtual.umidadeRelativaPct}%. Diagnóstico de plantio: ${diag.plantio.resumoConsultivo} ` +
      `${alertaResumo} ${dto.textoContexto ? `Contexto adicional da tela: ${dto.textoContexto}` : ''}`;

    let provedor = 'GOOGLE_GEMINI_FREE_TIER';
    let resumoFalado = await this.consultarGeminiFreeTier(systemInstruction, prompt);

    if (!resumoFalado) {
      provedor = 'POLLINATIONS_OPENAI_FREE';
      resumoFalado = await this.consultarPollinationsFreeApi(systemInstruction, prompt);
    }

    if (!resumoFalado) {
      provedor = 'MOTOR_AGROCLIMATICO_CAATINGA';
      resumoFalado =
        `Resumo falado do Manejo Caatingueiro para ${diag.localidade.nome}. ` +
        `${diag.chuvaAcumulada.fraseComparativa} A temperatura atual é de ${diag.meteorologiaAtual.temperaturaC} graus ` +
        `com umidade de ${diag.meteorologiaAtual.umidadeRelativaPct} por cento. ${diag.plantio.resumoConsultivo} ${alertaResumo}`;
    }

    return {
      resumoFalado: resumoFalado.replace(/[*#_`~]/g, ''),
      provedor,
      localidade: diag.localidade.nome,
      geradoEm: new Date().toISOString()
    };
  }
}

export const iaService = new IaService();
