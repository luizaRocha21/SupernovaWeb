package br.com.ifba.cultura.repository;

import br.com.ifba.cultura.entity.Cultura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CulturaRepository extends JpaRepository<Cultura, Long> {

    Optional<Cultura> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);
}
