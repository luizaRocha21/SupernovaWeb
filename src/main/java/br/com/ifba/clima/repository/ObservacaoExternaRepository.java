package br.com.ifba.clima.repository;

import br.com.ifba.clima.entity.ObservacaoExterna;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ObservacaoExternaRepository extends JpaRepository<ObservacaoExterna, Long> {

    Optional<ObservacaoExterna> findByLocalidadeIdAndDataObservacaoAndFonte(Long localidadeId, LocalDate data, String fonte);

    Optional<ObservacaoExterna> findFirstByLocalidadeIdOrderByDataObservacaoDesc(Long localidadeId);

    @Query("select count(o) from ObservacaoExterna o "
            + "where o.localidade.id = :locId and o.dataObservacao between :de and :ate")
    long contar(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select coalesce(sum(o.valorMm), 0.0) from ObservacaoExterna o "
            + "where o.localidade.id = :locId and o.dataObservacao between :de and :ate")
    Double somar(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select coalesce(max(o.valorMm), 0.0) from ObservacaoExterna o "
            + "where o.localidade.id = :locId and o.dataObservacao between :de and :ate")
    Double maior(@Param("locId") Long localidadeId, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    @Query("select max(o.fonteAtualizadaEm) from ObservacaoExterna o "
            + "where o.localidade.id = :locId and o.dataObservacao between :de and :ate")
    LocalDateTime ultimaAtualizacao(@Param("locId") Long localidadeId, @Param("de") LocalDate de,
                                    @Param("ate") LocalDate ate);
}
