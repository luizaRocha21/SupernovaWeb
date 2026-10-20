package br.com.ifba.cultura.controller;

import br.com.ifba.cultura.dto.CulturaDto;
import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.entity.CulturaLimiarUsuario;
import br.com.ifba.cultura.service.CulturaIService;
import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1/culturas")
@RequiredArgsConstructor
public class CulturaController {

    private final CulturaIService culturaService;

    @GetMapping
    public ResponseEntity<List<CulturaDto.Response>> findAll() {
        List<CulturaDto.Response> corpo = culturaService.findAll().stream().map(CulturaDto.Response::de).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate()).body(corpo);
    }

    @PostMapping
    @PreAuthorize("hasRole('GESTOR_PUBLICO')")
    public ResponseEntity<CulturaDto.Response> save(@Valid @RequestBody CulturaDto.Request request) {
        Cultura salva = culturaService.save(request.toEntity());
        return ResponseEntity.status(HttpStatus.CREATED).body(CulturaDto.Response.de(salva));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR_PUBLICO')")
    public CulturaDto.Response update(@PathVariable Long id, @Valid @RequestBody CulturaDto.Request request) {
        return CulturaDto.Response.de(culturaService.update(id, request.toEntity()));
    }

    /** RN09: qualquer usuário autenticado pode ajustar o próprio limiar, sem bloqueio. */
    @PutMapping("/{id}/limiar-usuario")
    public CulturaDto.LimiarUsuarioResponse limiarUsuario(@PathVariable Long id,
                                                          @Valid @RequestBody CulturaDto.LimiarUsuarioRequest request,
                                                          @AuthenticationPrincipal UsuarioAutenticado usuario) {
        CulturaLimiarUsuario salvo = culturaService.saveLimiarUsuario(usuario.id(), id, request.limiarMm());
        return new CulturaDto.LimiarUsuarioResponse(id, salvo.getLimiarMm(), true);
    }
}
