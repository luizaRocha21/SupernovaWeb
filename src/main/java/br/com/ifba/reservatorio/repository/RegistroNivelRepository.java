package br.com.ifba.reservatorio.repository;

import br.com.ifba.reservatorio.entity.RegistroNivel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegistroNivelRepository extends JpaRepository<RegistroNivel, Long> {

    Optional<RegistroNivel> findByIdClienteSync(String idClienteSync);

    Optional<RegistroNivel> findByReservatorioIdAndDataRegistro(Long reservatorioId, LocalDate dataRegistro);

    /**
     * Último registro sincronizado de cada reservatório das localidades, só de responsáveis com
     * consentimento (RN10, RN15).
     */
    @Query("select r from RegistroNivel r "
            + "where r.pendenteSincronizacao = false "
            + "and r.reservatorio.localidade.id in :ids "
            + "and r.reservatorio.responsavel.consentimentoLocalizacao = true "
            + "and r.dataRegistro = (select max(r2.dataRegistro) from RegistroNivel r2 "
            + "where r2.reservatorio = r.reservatorio and r2.pendenteSincronizacao = false)")
    List<RegistroNivel> findUltimosAgregaveis(@Param("ids") Collection<Long> ids);
}
