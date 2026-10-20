package br.com.ifba.painel.repository;

import br.com.ifba.painel.entity.SugestaoPlantio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SugestaoPlantioRepository extends JpaRepository<SugestaoPlantio, Long> {
}
