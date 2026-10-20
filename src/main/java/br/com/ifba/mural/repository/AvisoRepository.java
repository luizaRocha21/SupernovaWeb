package br.com.ifba.mural.repository;

import br.com.ifba.mural.entity.Aviso;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AvisoRepository extends JpaRepository<Aviso, Long> {

    @EntityGraph(attributePaths = "localidade")
    List<Aviso> findByLocalidadeIdAndCriadoEmAfterOrderByCriadoEmDesc(Long localidadeId, LocalDateTime desde);
}
