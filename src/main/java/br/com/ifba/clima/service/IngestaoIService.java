package br.com.ifba.clima.service;

import br.com.ifba.clima.dto.IngestaoDto;

import java.util.List;

public interface IngestaoIService {

    /** RF18: carrega série histórica e chuva recente de uma localidade (upsert, idempotente). */
    IngestaoDto.Resultado ingerir(Long localidadeId);

    /** Roda a ingestão para todas as localidades; falha em uma não interrompe as demais. */
    List<IngestaoDto.Resultado> ingerirTodas();
}
