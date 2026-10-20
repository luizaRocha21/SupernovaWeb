package br.com.ifba.painel.service;

import br.com.ifba.clima.entity.SerieHistorica;
import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.service.CulturaIService;
import br.com.ifba.infrastructure.config.ClimaProperties;
import br.com.ifba.infrastructure.config.SugestaoProperties;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.painel.dto.PainelDto;
import br.com.ifba.painel.entity.NivelSugestao;
import br.com.ifba.painel.entity.SugestaoPlantio;
import br.com.ifba.painel.repository.SugestaoPlantioRepository;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SugestaoPlantioService implements SugestaoPlantioIService {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Extensão de uma normal climatológica padrão (30 anos): base do grau de confiança. */
    private static final double ANOS_IDEAIS = 30.0;

    private final PainelChuvaIService painelService;
    private final CulturaIService culturaService;
    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final SugestaoPlantioRepository sugestaoRepository;
    private final ClimaProperties clima;
    private final SugestaoProperties sugestaoProperties;
    private final Clock clock;

    @Override
    @Transactional
    public SugestaoPlantio gerar(Long usuarioId, Long localidadeId, String culturaNome) {
        Cultura cultura = culturaService.findByNome(culturaNome);
        Usuario usuario = usuarioService.findById(usuarioId);
        Localidade localidade = localidadeService.findById(localidadeId);
        LocalDate hoje = LocalDate.now(clock);
        int mes = hoje.getMonthValue();
        CulturaIService.LimiarEfetivo limiar = culturaService.findLimiarEfetivo(usuarioId, cultura); // RN09

        log.info("Gerando sugestão de plantio cultura={} localidadeId={}", cultura.getNome(), localidadeId);

        SugestaoPlantio sugestao = new SugestaoPlantio();
        sugestao.setUsuario(usuario);
        sugestao.setLocalidade(localidade);
        sugestao.setCultura(cultura);
        sugestao.setReferenciaMm(limiar.valorMm());

        Optional<SerieHistorica> normal = painelService.findNormalDoMes(localidade, mes);

        // RN04: sem série histórica suficiente, não há sugestão
        if (!painelService.historicoSuficiente(localidade, mes)) {
            log.warn("RN04: histórico insuficiente para sugerir localidadeId={}", localidadeId);
            return salvarInsuficiente(sugestao, normal,
                    "Ainda não temos histórico de chuva suficiente para a sua região para sugerir com segurança.");
        }

        PainelDto.MedidaChuva medida = painelService.valorPorCriterio(localidadeId, cultura, hoje);
        if (!medida.temDados()) {
            log.warn("RN04: sem observação recente de chuva localidadeId={}", localidadeId);
            return salvarInsuficiente(sugestao, normal,
                    "Ainda não temos observação recente de chuva para a sua região.");
        }

        double razao = medida.valorMm() / limiar.valorMm();
        NivelSugestao resultado;
        if (razao >= 1.0) {
            resultado = NivelSugestao.CONDICAO_FAVORAVEL;
        } else if (razao >= sugestaoProperties.faixaAtencao()) {
            resultado = NivelSugestao.ATENCAO_CONSIDERE_ADIAR;
        } else {
            resultado = NivelSugestao.CONSIDERE_CULTURA_ALTERNATIVA;
        }

        double confiancaAnos = Math.min(1.0, normal.get().getAnosBase() / ANOS_IDEAIS);
        double confianca = Math.round((0.6 * confiancaAnos + (medida.fonteExterna() ? 0.4 : 0.2)) * 100) / 100.0;

        sugestao.setResultado(resultado);
        sugestao.setDadoUsadoMm(medida.valorMm());
        sugestao.setFonteDado(medida.fonte());
        sugestao.setDataDado(medida.atualizadoEm());
        sugestao.setGrauConfianca(confianca);
        sugestao.setJustificativa(mensagem(resultado, cultura, medida, limiar, confianca));
        return sugestaoRepository.save(sugestao);
    }

    private SugestaoPlantio salvarInsuficiente(SugestaoPlantio sugestao, Optional<SerieHistorica> normal, String motivo) {
        sugestao.setResultado(NivelSugestao.DADOS_INSUFICIENTES);
        sugestao.setGrauConfianca(0.0);
        sugestao.setFonteDado(normal.map(SerieHistorica::getFonte).orElse("Sem série histórica disponível"));
        sugestao.setDataDado(normal.map(SerieHistorica::getFonteAtualizadaEm).orElse(null));
        sugestao.setJustificativa(motivo + " Se você tem pluviômetro, registrar a chuva ajuda a melhorar a indicação. "
                + "A decisão de plantar continua sendo sua, com o que você observa na sua terra.");
        return sugestaoRepository.save(sugestao);
    }

    /** RN12: linguagem de apoio, sempre com o dado, a fonte, a data e a decisão devolvida ao agricultor. */
    private String mensagem(NivelSugestao nivel, Cultura cultura, PainelDto.MedidaChuva medida,
                            CulturaIService.LimiarEfetivo limiar, double confianca) {
        String dado = String.format(PT_BR, "%.1f mm %s, contra %.1f mm de referência (%s)",
                medida.valorMm(), descricaoCriterio(cultura), limiar.valorMm(), limiar.fonte());
        String origem = String.format(PT_BR, "Fonte: %s%s. Confiança da indicação: %.0f%%.", medida.fonte(),
                dataTexto(medida.atualizadoEm()), confianca * 100);
        return switch (nivel) {
            case CONDICAO_FAVORAVEL -> "Pelos dados disponíveis, a chuva está dentro do que " + cultura.getNome()
                    + " costuma pedir: " + dado + ". É uma indicação, não uma garantia. A decisão é sua, e você conhece "
                    + "a sua terra melhor do que qualquer sistema. " + origem;
            case ATENCAO_CONSIDERE_ADIAR -> "Atenção: a chuva está um pouco abaixo do que " + cultura.getNome()
                    + " costuma pedir: " + dado + ". Pode valer esperar mais alguns dias ou plantar uma área menor. "
                    + "Se a sua leitura da terra aponta outro caminho, ela também conta. A decisão é sua. " + origem;
            case CONSIDERE_CULTURA_ALTERNATIVA -> "A chuva está bem abaixo do que " + cultura.getNome()
                    + " costuma pedir: " + dado + ". Vale considerar adiar ou avaliar outra cultura. "
                    + "É só uma sugestão baseada em dados; a decisão é sua e a sua experiência pesa. " + origem;
            case DADOS_INSUFICIENTES -> "Sem dados suficientes para sugerir. A decisão é sua.";
        };
    }

    private String descricaoCriterio(Cultura cultura) {
        return switch (cultura.getTipoCriterio()) {
            case ACUMULADO_JANELA -> "acumulados nos últimos "
                    + (cultura.getJanelaDias() != null ? cultura.getJanelaDias() : clima.janelaPadraoDias()) + " dias";
            case VOLUME_POR_EVENTO -> "na maior chuva dos últimos " + clima.diasChuvaRecente() + " dias";
            case INICIO_ESTACAO -> "acumulados desde o início da estação chuvosa";
        };
    }

    private String dataTexto(LocalDateTime atualizadoEm) {
        return atualizadoEm != null ? ", atualizado em " + atualizadoEm.format(DATA) : "";
    }
}
