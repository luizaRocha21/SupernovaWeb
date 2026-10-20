package br.com.ifba.painel.service;

import br.com.ifba.clima.entity.ObservacaoExterna;
import br.com.ifba.clima.entity.SerieHistorica;
import br.com.ifba.clima.repository.ObservacaoExternaRepository;
import br.com.ifba.clima.repository.SerieHistoricaRepository;
import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.service.CulturaIService;
import br.com.ifba.infrastructure.config.ClimaProperties;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.painel.dto.PainelDto;
import br.com.ifba.precipitacao.repository.PrecipitacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PainelChuvaService implements PainelChuvaIService {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final String FONTE_MANUAL = "Registros dos usuários da localidade (pluviômetro próprio ou estimativa)";

    private final LocalidadeIService localidadeService;
    private final CulturaIService culturaService;
    private final SerieHistoricaRepository serieRepository;
    private final ObservacaoExternaRepository observacaoRepository;
    private final PrecipitacaoRepository precipitacaoRepository;
    private final ClimaProperties clima;
    private final Clock clock;

    @Override
    public PainelDto.Painel consultar(Long localidadeId, String culturaNome, Long usuarioId) {
        Localidade localidade = localidadeService.findById(localidadeId);
        LocalDate hoje = LocalDate.now(clock);
        log.info("Consultando painel de chuva localidadeId={}", localidadeId);

        PainelDto.MedidaChuva mes = medirPeriodo(localidadeId, hoje.withDayOfMonth(1), hoje, false);
        PainelDto.MedidaChuva estacao = medirPeriodo(localidadeId, inicioDaEstacao(hoje), hoje, false);
        PainelDto.MedidaChuva recente = medirPeriodo(localidadeId,
                hoje.minusDays(clima.diasChuvaRecente() - 1L), hoje, true);

        Optional<SerieHistorica> normal = findNormalDoMes(localidade, hoje.getMonthValue());
        boolean suficiente = historicoSuficiente(localidade, hoje.getMonthValue());

        Double acumuladoMes = mes.temDados() ? mes.valorMm() : null;
        Double normalMes = normal.map(SerieHistorica::getNormalMm).orElse(null);
        Double percentual = (acumuladoMes != null && normalMes != null && normalMes > 0)
                ? Math.round(acumuladoMes / normalMes * 1000) / 10.0 : null;

        // RN16: fonte e data de atualização da primeira medida que tenha dados
        PainelDto.MedidaChuva referencia = mes.temDados() ? mes : (estacao.temDados() ? estacao : recente);
        String fonte = referencia.temDados() ? referencia.fonte() : "SEM DADOS DISPONÍVEIS";

        PainelDto.ComparacaoCultura comparacao = null;
        if (culturaNome != null && !culturaNome.isBlank()) {
            Cultura cultura = culturaService.findByNome(culturaNome);
            CulturaLimiar limiar = limiarDe(usuarioId, cultura);
            PainelDto.MedidaChuva valor = valorPorCriterio(localidadeId, cultura, hoje);
            comparacao = new PainelDto.ComparacaoCultura(cultura.getNome(), cultura.getTipoCriterio(),
                    valor.temDados() ? valor.valorMm() : null, limiar.valorMm, limiar.fonte, limiar.personalizado,
                    valor.temDados() && valor.valorMm() >= limiar.valorMm);
        }

        return new PainelDto.Painel(localidade.getId(), localidade.getNome(), hoje.getYear(), hoje.getMonthValue(),
                acumuladoMes, normalMes, percentual,
                estacao.temDados() ? estacao.valorMm() : null,
                recente.temDados() ? recente.valorMm() : null,
                suficiente, resumo(acumuladoMes, normalMes, percentual),
                fonte, referencia.atualizadoEm(), comparacao);
    }

    @Override
    public PainelDto.MedidaChuva valorPorCriterio(Long localidadeId, Cultura cultura, LocalDate hoje) {
        return switch (cultura.getTipoCriterio()) {
            case ACUMULADO_JANELA -> {
                int dias = cultura.getJanelaDias() != null ? cultura.getJanelaDias() : clima.janelaPadraoDias();
                yield medirPeriodo(localidadeId, hoje.minusDays(dias - 1L), hoje, false);
            }
            case VOLUME_POR_EVENTO -> medirPeriodo(localidadeId,
                    hoje.minusDays(clima.diasChuvaRecente() - 1L), hoje, true);
            case INICIO_ESTACAO -> medirPeriodo(localidadeId, inicioDaEstacao(hoje), hoje, false);
        };
    }

    @Override
    public Optional<SerieHistorica> findNormalDoMes(Localidade localidade, int mes) {
        Optional<SerieHistorica> propria = serieRepository.findByLocalidadeIdAndMes(localidade.getId(), mes);
        if (propria.isPresent() || localidade.getPai() == null) {
            return propria;
        }
        return serieRepository.findByLocalidadeIdAndMes(localidade.getPai().getId(), mes);
    }

    @Override
    public boolean historicoSuficiente(Localidade localidade, int mes) { // RN04
        return findNormalDoMes(localidade, mes)
                .map(s -> s.getAnosBase() >= clima.anosMinimosSerie())
                .orElse(false);
    }

    /** Dado externo é a base; registros manuais só entram quando não há dado externo no período (RN04). */
    private PainelDto.MedidaChuva medirPeriodo(Long localidadeId, LocalDate de, LocalDate ate, boolean maiorEvento) {
        if (observacaoRepository.contar(localidadeId, de, ate) > 0) {
            double valor = maiorEvento
                    ? observacaoRepository.maior(localidadeId, de, ate)
                    : observacaoRepository.somar(localidadeId, de, ate);
            String fonte = observacaoRepository.findFirstByLocalidadeIdOrderByDataObservacaoDesc(localidadeId)
                    .map(ObservacaoExterna::getFonte).orElse("Fonte externa");
            return new PainelDto.MedidaChuva(valor, true, true, fonte,
                    observacaoRepository.ultimaAtualizacao(localidadeId, de, ate));
        }
        if (precipitacaoRepository.contar(localidadeId, de, ate) > 0) {
            double valor = maiorEvento
                    ? precipitacaoRepository.maior(localidadeId, de, ate)
                    : precipitacaoRepository.somar(localidadeId, de, ate);
            return new PainelDto.MedidaChuva(valor, false, true, FONTE_MANUAL,
                    precipitacaoRepository.ultimaAtualizacao(localidadeId, de, ate));
        }
        return new PainelDto.MedidaChuva(0.0, false, false, "SEM DADOS", null);
    }

    private LocalDate inicioDaEstacao(LocalDate hoje) {
        int mesInicio = clima.inicioEstacaoChuvosaMes();
        int ano = hoje.getMonthValue() >= mesInicio ? hoje.getYear() : hoje.getYear() - 1;
        return LocalDate.of(ano, mesInicio, 1);
    }

    private String resumo(Double acumulado, Double normal, Double percentual) {
        if (acumulado == null) {
            return "Ainda não há registro de chuva neste mês para a sua região.";
        }
        if (normal == null) {
            return String.format(PT_BR, "Choveu %.1f mm este mês. Ainda não há histórico para comparar com o normal.",
                    acumulado);
        }
        return String.format(PT_BR, "Choveu %.1f mm este mês; o normal para esse mês é %.1f mm (%.0f%% do normal).",
                acumulado, normal, percentual != null ? percentual : 0.0);
    }

    private CulturaLimiar limiarDe(Long usuarioId, Cultura cultura) {
        if (usuarioId == null) {
            return new CulturaLimiar(cultura.getLimiarPadraoMm(), cultura.getFonteLimiar(), false);
        }
        CulturaIService.LimiarEfetivo l = culturaService.findLimiarEfetivo(usuarioId, cultura);
        return new CulturaLimiar(l.valorMm(), l.fonte(), l.personalizado());
    }

    private record CulturaLimiar(double valorMm, String fonte, boolean personalizado) {
    }
}
