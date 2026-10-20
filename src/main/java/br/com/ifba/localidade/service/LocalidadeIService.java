package br.com.ifba.localidade.service;

import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.usuario.entity.Usuario;

import java.util.List;

public interface LocalidadeIService {

    Localidade save(Localidade localidade, Long paiId);

    List<Localidade> findAll();

    Localidade findById(Long id);

    List<Localidade> findByPaiId(Long paiId);

    /** Regra de visibilidade (RN07/RN15): o usuário acessa a própria localidade ou o município ao qual pertence. */
    boolean podeAcessar(Usuario usuario, Long localidadeId);

    /** A localidade informada mais os povoados filhos (agregação por município). */
    List<Long> findIdsComDescendentes(Long localidadeId);
}
