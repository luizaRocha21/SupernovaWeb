package br.com.ifba.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.sugestao")
public record SugestaoProperties(@DefaultValue("0.6") double faixaAtencao) {
}
