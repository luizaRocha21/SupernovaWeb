package br.com.ifba.usuario.repository;

import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @Override
    @EntityGraph(attributePaths = "localidade")
    Optional<Usuario> findById(Long id);

    @EntityGraph(attributePaths = "localidade")
    Optional<Usuario> findByTelefone(String telefone);

    boolean existsByTelefone(String telefone);

    boolean existsByPerfil(Perfil perfil);
}
