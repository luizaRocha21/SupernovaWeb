package br.com.ifba.alerta.service;

import br.com.ifba.alerta.entity.Alerta;

import java.util.List;

public interface AlertaIService {

    /** RF12: só liderança comunitária ou gestor público, e só para a própria localidade (ou o município dela). */
    Alerta save(Alerta alerta, Long emissorId, Long localidadeId);

    /** RF13 + RN07: alertas vigentes, visíveis apenas a usuários da localidade a que se referem. */
    List<Alerta> findVigentesByLocalidade(Long usuarioId, Long localidadeId);
}
