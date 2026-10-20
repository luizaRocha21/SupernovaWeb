package br.com.ifba.checklist.repository;

import br.com.ifba.checklist.entity.ChecklistSanitario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChecklistSanitarioRepository extends JpaRepository<ChecklistSanitario, Long> {

    Optional<ChecklistSanitario> findFirstByReservatorioIdOrderByCriadoEmDesc(Long reservatorioId);
}
