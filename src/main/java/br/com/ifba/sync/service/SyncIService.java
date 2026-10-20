package br.com.ifba.sync.service;

import br.com.ifba.sync.dto.SyncDto;

import java.util.List;

public interface SyncIService {

    /** RF17: processa um lote da fila de escrita. Idempotente por idClienteSync; erros são por item. */
    List<SyncDto.Resultado> processar(Long usuarioId, List<SyncDto.Item> itens);
}
