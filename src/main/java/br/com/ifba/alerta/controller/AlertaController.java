package br.com.ifba.alerta.controller;

import br.com.ifba.alerta.dto.AlertaDto;
import br.com.ifba.alerta.entity.Alerta;
import br.com.ifba.alerta.service.AlertaIService;
import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alertas")
@RequiredArgsConstructor
public class AlertaController {

    private final AlertaIService alertaService;

    @PostMapping
    @PreAuthorize("hasAnyRole('LIDERANCA_COMUNITARIA','GESTOR_PUBLICO')")
    public ResponseEntity<AlertaDto.Response> save(@Valid @RequestBody AlertaDto.Request request,
                                                   @AuthenticationPrincipal UsuarioAutenticado usuario) {
        Alerta salvo = alertaService.save(request.toEntity(), usuario.id(), request.localidadeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(AlertaDto.Response.de(salvo));
    }

    @GetMapping
    public List<AlertaDto.Response> findVigentes(@RequestParam Long localidadeId,
                                                 @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return alertaService.findVigentesByLocalidade(usuario.id(), localidadeId).stream()
                .map(AlertaDto.Response::de).toList();
    }
}
