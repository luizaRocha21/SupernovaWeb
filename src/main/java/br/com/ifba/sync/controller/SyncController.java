package br.com.ifba.sync.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.sync.dto.SyncDto;
import br.com.ifba.sync.service.SyncIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncIService syncService;

    @PostMapping("/registros")
    public List<SyncDto.Resultado> sincronizar(@Valid @RequestBody SyncDto.Lote lote,
                                               @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return syncService.processar(usuario.id(), lote.registros());
    }
}
