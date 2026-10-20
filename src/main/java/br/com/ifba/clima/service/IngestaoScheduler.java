package br.com.ifba.clima.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Job de ingestão. Desligado por padrão: só habilitar com uma fonte real (app.clima.ingestao-agendada=true). */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.clima.ingestao-agendada", havingValue = "true")
public class IngestaoScheduler {

    private final IngestaoIService ingestaoService;

    @Scheduled(cron = "${app.clima.ingestao-cron:0 0 5 * * *}")
    public void executar() {
        log.info("Iniciando ingestão agendada de dados climáticos");
        ingestaoService.ingerirTodas();
    }
}
