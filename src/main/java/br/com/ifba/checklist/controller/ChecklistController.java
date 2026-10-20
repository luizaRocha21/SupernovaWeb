package br.com.ifba.checklist.controller;

import br.com.ifba.checklist.dto.ChecklistDto;
import br.com.ifba.checklist.entity.ChecklistSanitario;
import br.com.ifba.checklist.service.ChecklistIService;
import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reservatorios/{reservatorioId}/checklists")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.features", name = "checklist", havingValue = "true")
public class ChecklistController {

    private final ChecklistIService checklistService;

    @PostMapping
    public ResponseEntity<ChecklistDto.Response> save(@PathVariable Long reservatorioId,
                                                      @RequestBody ChecklistDto.Request request,
                                                      @AuthenticationPrincipal UsuarioAutenticado usuario) {
        ChecklistSanitario salvo = checklistService.save(request.toEntity(), reservatorioId, usuario.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(ChecklistDto.Response.de(salvo));
    }

    @GetMapping("/ultimo")
    public ResponseEntity<ChecklistDto.Response> findUltimo(@PathVariable Long reservatorioId,
                                                            @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return checklistService.findUltimo(reservatorioId, usuario.id())
                .map(c -> ResponseEntity.ok(ChecklistDto.Response.de(c)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
