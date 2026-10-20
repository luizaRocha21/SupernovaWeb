package br.com.ifba.precipitacao.repository;

import br.com.ifba.precipitacao.entity.Precipitacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PrecipitacaoRepository extends JpaRepository<Precipitacao, Long> {

    @EntityGraph(attributePaths = "localidade")
    Page<Precipitacao> findByUsuarioId(Long usuarioId, Pageable pageable);

    @EntityGraph(attributePaths = "localidade")
    Optional<Precipitacao> findByIdClienteSync(String idClienteSync);

    @Query("select count(p) from Precipitacao p where p.localidade.id = :locId and p.dataEvento between :de and :ate")
    long contar(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select coalesce(sum(p.volumeMm), 0.0) from Precipitacao p "
            + "where p.localidade.id = :locId and p.dataEvento between :de and :ate")
    Double somar(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select coalesce(max(p.volumeMm), 0.0) from Precipitacao p "
            + "where p.localidade.id = :locId and p.dataEvento between :de and :ate")
    Double maior(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select max(p.criadoEm) from Precipitacao p "
            + "where p.localidade.id = :locId and p.dataEvento between :de and :ate")
    LocalDateTime ultimaAtualizacao(@Param("locId") Long localidadeId, @Param("de") LocalDate de,
                                    @Param("ate") LocalDate ate);
}
