package br.com.ifba.painel.service;

import br.com.ifba.painel.entity.SugestaoPlantio;

public interface SugestaoPlantioIService {

    /**
     * RF06: gera e registra (auditoria) uma sugestão consultiva de plantio.
     * Nunca bloqueia nem penaliza uma decisão divergente (RN12).
     */
    SugestaoPlantio gerar(Long usuarioId, Long localidadeId, String culturaNome);
}
