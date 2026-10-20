package br.com.ifba.cultura.repository;

import br.com.ifba.cultura.entity.CulturaLimiarUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CulturaLimiarUsuarioRepository extends JpaRepository<CulturaLimiarUsuario, Long> {

    Optional<CulturaLimiarUsuario> findByUsuarioIdAndCulturaId(Long usuarioId, Long culturaId);
}
