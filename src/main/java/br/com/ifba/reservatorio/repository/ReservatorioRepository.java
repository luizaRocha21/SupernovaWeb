package br.com.ifba.reservatorio.repository;

import br.com.ifba.reservatorio.entity.Reservatorio;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservatorioRepository extends JpaRepository<Reservatorio, Long> {

    @Override
    @EntityGraph(attributePaths = {"responsavel", "localidade"})
    Optional<Reservatorio> findById(Long id);

    @EntityGraph(attributePaths = "localidade")
    List<Reservatorio> findByResponsavelId(Long responsavelId);

    /** RN15: responsáveis distintos, com consentimento e ao menos um registro sincronizado. */
    @Query("select count(distinct rv.responsavel.id) from Reservatorio rv "
            + "where rv.localidade.id in :ids and rv.responsavel.consentimentoLocalizacao = true "
            + "and exists (select 1 from RegistroNivel r where r.reservatorio = rv and r.pendenteSincronizacao = false)")
    long contarResponsaveisAgregaveis(@Param("ids") Collection<Long> ids);
}
