package br.com.ifba.reservatorio.service;

import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.entity.Reservatorio;
import br.com.ifba.sync.dto.ResultadoGravacao;

import java.util.List;

public interface ReservatorioIService {

    /** RF07: cadastra o reservatório do usuário. Não se aplica a quem usa só água encanada. */
    Reservatorio save(Reservatorio reservatorio, Long responsavelId, Long localidadeId);

    Reservatorio findById(Long id);

    List<Reservatorio> findByResponsavelId(Long responsavelId);

    /**
     * RF07: registra o nível. RN01 (só o responsável), RN02 (um por dia, o novo substitui) e
     * idempotência por idClienteSync (RN13).
     */
    ResultadoGravacao<RegistroNivel> saveNivel(Long reservatorioId, Long usuarioId, RegistroNivel novo);
}
