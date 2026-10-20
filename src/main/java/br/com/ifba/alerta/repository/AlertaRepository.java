package br.com.ifba.alerta.repository;

import br.com.ifba.alerta.entity.Alerta;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertaRepository extends JpaRepository<Alerta, Long> {

    @EntityGraph(attributePaths = "localidade")
    @Query("select a from Alerta a where a.localidade.id = :locId "
            + "and a.vigenciaInicio <= :agora and a.vigenciaFim >= :agora order by a.vigenciaInicio desc")
    List<Alerta> findVigentes(@Param("locId") Long localidadeId, @Param("agora") LocalDateTime agora);
}
