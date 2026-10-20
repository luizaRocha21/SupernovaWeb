package br.com.ifba.reservatorio.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.reservatorio.dto.MonitorDto;
import br.com.ifba.reservatorio.service.MonitorIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/localidades")
@RequiredArgsConstructor
public class MonitorController {

    private final MonitorIService monitorService;

    @GetMapping("/{id}/monitor-reservatorios")
    public ResponseEntity<MonitorDto.Monitor> monitor(@PathVariable Long id,
                                                      @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(1)).cachePrivate())
                .body(monitorService.consultar(id, usuario.id()));
    }
}
