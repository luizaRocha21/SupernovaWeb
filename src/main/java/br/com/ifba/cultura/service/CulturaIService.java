package br.com.ifba.cultura.service;

import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.entity.CulturaLimiarUsuario;

import java.util.List;

public interface CulturaIService {

    /** Limiar efetivo para um usuário: o personalizado, se houver, senão o padrão (RN09). */
    record LimiarEfetivo(double valorMm, String fonte, boolean personalizado) {
    }

    Cultura save(Cultura cultura);

    Cultura update(Long id, Cultura dados);

    List<Cultura> findAll();

    Cultura findById(Long id);

    Cultura findByNome(String nome);

    CulturaLimiarUsuario saveLimiarUsuario(Long usuarioId, Long culturaId, Double limiarMm);

    LimiarEfetivo findLimiarEfetivo(Long usuarioId, Cultura cultura);
}
