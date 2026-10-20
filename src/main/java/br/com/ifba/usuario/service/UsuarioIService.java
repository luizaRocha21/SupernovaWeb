package br.com.ifba.usuario.service;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.usuario.entity.Usuario;

import java.util.Optional;

public interface UsuarioIService {

    /**
     * RF01. O cadastro público só cria AGRICULTOR; os demais perfis exigem um GESTOR_PUBLICO autenticado.
     *
     * @param solicitante principal autenticado, ou null se anônimo
     */
    Usuario save(Usuario usuario, String senhaPlana, Long localidadeId, UsuarioAutenticado solicitante);

    Usuario findById(Long id);

    Optional<Usuario> findByTelefone(String telefone);
}
