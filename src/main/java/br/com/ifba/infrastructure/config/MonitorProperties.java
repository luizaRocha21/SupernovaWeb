package br.com.ifba.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** RN15: número mínimo de responsáveis distintos para exibir o agregado comunitário. */
@ConfigurationProperties(prefix = "app.monitor")
public record MonitorProperties(@DefaultValue("5") int minimoParticipantes) {
}
