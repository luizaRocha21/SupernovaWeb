package br.com.ifba.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Parâmetros do eixo climático (RF04, RF06, RF18). Valores padrão são suposições a validar. */
@ConfigurationProperties(prefix = "app.clima")
public record ClimaProperties(
        @DefaultValue("stub") String fonte,
        @DefaultValue("false") boolean ingestaoAgendada,
        @DefaultValue("10") int anosMinimosSerie,
        @DefaultValue("11") int inicioEstacaoChuvosaMes,
        @DefaultValue("7") int diasChuvaRecente,
        @DefaultValue("30") int janelaPadraoDias) {
}
