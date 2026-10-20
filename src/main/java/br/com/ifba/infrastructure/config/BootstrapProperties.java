package br.com.ifba.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.bootstrap")
public record BootstrapProperties(
        @DefaultValue("") String gestorTelefone,
        @DefaultValue("") String gestorSenha,
        @DefaultValue("Gestor inicial") String gestorNome,
        @DefaultValue("Município inicial") String localidadeNome) {
}
