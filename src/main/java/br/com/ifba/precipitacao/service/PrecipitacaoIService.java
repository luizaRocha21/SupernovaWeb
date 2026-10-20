package br.com.ifba.precipitacao.service;

import br.com.ifba.precipitacao.entity.Precipitacao;
import br.com.ifba.sync.dto.ResultadoGravacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PrecipitacaoIService {

    /**
     * RF03. Idempotente quando há idClienteSync (RN13). Se localidadeId for nulo, usa a localidade do usuário.
     */
    ResultadoGravacao<Precipitacao> save(Precipitacao precipitacao, Long usuarioId, Long localidadeId);

    /** Lista apenas os registros do próprio usuário (nunca expõe dado individual de vizinhos). */
    Page<Precipitacao> findByUsuarioId(Long usuarioId, Pageable pageable);
}
