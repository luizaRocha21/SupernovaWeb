package br.com.ifba.checklist.service;

import br.com.ifba.checklist.entity.ChecklistSanitario;

import java.util.Optional;

public interface ChecklistIService {

    /** RF16: só o responsável do reservatório registra o checklist (mesma lógica da RN01). */
    ChecklistSanitario save(ChecklistSanitario checklist, Long reservatorioId, Long usuarioId);

    /** Último checklist, visível apenas ao responsável (nunca a vizinhos, RN15). */
    Optional<ChecklistSanitario> findUltimo(Long reservatorioId, Long usuarioId);
}
