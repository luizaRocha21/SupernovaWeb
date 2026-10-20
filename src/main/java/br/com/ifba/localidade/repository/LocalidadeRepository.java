package br.com.ifba.localidade.repository;

import br.com.ifba.localidade.entity.Localidade;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocalidadeRepository extends JpaRepository<Localidade, Long> {

    @Override
    @EntityGraph(attributePaths = "pai")
    Optional<Localidade> findById(Long id);

    @Override
    @EntityGraph(attributePaths = "pai")
    List<Localidade> findAll();

    @EntityGraph(attributePaths = "pai")
    List<Localidade> findByPaiId(Long paiId);

    boolean existsByNomeIgnoreCase(String nome);
}
