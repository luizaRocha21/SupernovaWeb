package br.com.ifba.checklist.service;

import br.com.ifba.checklist.entity.ChecklistSanitario;
import br.com.ifba.checklist.repository.ChecklistSanitarioRepository;
import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.reservatorio.entity.Reservatorio;
import br.com.ifba.reservatorio.service.ReservatorioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@ConditionalOnProperty(prefix = "app.features", name = "checklist", havingValue = "true")
public class ChecklistService implements ChecklistIService {

    private final ChecklistSanitarioRepository checklistRepository;
    private final ReservatorioIService reservatorioService;

    @Override
    @Transactional
    public ChecklistSanitario save(ChecklistSanitario checklist, Long reservatorioId, Long usuarioId) {
        Reservatorio reservatorio = responsavelOuFalha(reservatorioId, usuarioId);
        checklist.setReservatorio(reservatorio);
        log.info("Salvando checklist sanitário reservatorioId={}", reservatorioId);
        return checklistRepository.save(checklist);
    }

    @Override
    public Optional<ChecklistSanitario> findUltimo(Long reservatorioId, Long usuarioId) {
        responsavelOuFalha(reservatorioId, usuarioId);
        return checklistRepository.findFirstByReservatorioIdOrderByCriadoEmDesc(reservatorioId);
    }

    private Reservatorio responsavelOuFalha(Long reservatorioId, Long usuarioId) {
        Reservatorio reservatorio = reservatorioService.findById(reservatorioId);
        if (!reservatorio.getResponsavel().getId().equals(usuarioId)) {
            log.warn("Acesso ao checklist negado: usuário não é o responsável reservatorioId={}", reservatorioId);
            throw new AcessoProibidoException("Somente o responsável pelo reservatório acessa o checklist.");
        }
        return reservatorio;
    }
}
