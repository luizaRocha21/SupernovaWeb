package br.com.ifba.clima.repository;

import br.com.ifba.clima.entity.SerieHistorica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SerieHistoricaRepository extends JpaRepository<SerieHistorica, Long> {

    Optional<SerieHistorica> findByLocalidadeIdAndMes(Long localidadeId, Integer mes);
}
