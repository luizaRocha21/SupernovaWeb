package br.com.ifba.reservatorio.service;

import br.com.ifba.reservatorio.dto.MonitorDto;

public interface MonitorIService {

    /** RF08: visão agregada dos reservatórios da localidade (e povoados filhos), respeitando a RN15. */
    MonitorDto.Monitor consultar(Long localidadeId, Long usuarioId);
}
