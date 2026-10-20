package br.com.ifba.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, @DefaultValue("480") long expiracaoMinutos) {
}
