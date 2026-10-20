package br.com.ifba.mural.service;

import br.com.ifba.mural.entity.Aviso;

import java.util.List;

public interface AvisoIService {

    /** RF14: só liderança comunitária publica, na própria localidade. */
    Aviso save(Aviso aviso, Long autorId, Long localidadeId);

    /** RF15 + RN08: avisos dos últimos 30 dias da localidade do usuário. */
    List<Aviso> findVigentesByLocalidade(Long usuarioId, Long localidadeId);
}
