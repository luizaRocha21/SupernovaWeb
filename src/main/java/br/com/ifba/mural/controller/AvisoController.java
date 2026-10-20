package br.com.ifba.mural.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.mural.dto.AvisoDto;
import br.com.ifba.mural.entity.Aviso;
import br.com.ifba.mural.service.AvisoIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
@RequestMapping("/api/v1/avisos")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.features", name = "mural", havingValue = "true")
public class AvisoController {

    private final AvisoIService avisoService;

    @PostMapping
    @PreAuthorize("hasRole('LIDERANCA_COMUNITARIA')")
    public ResponseEntity<AvisoDto.Response> save(@Valid @RequestBody AvisoDto.Request request,
                                                  @AuthenticationPrincipal UsuarioAutenticado usuario) {
        Aviso salvo = avisoService.save(request.toEntity(), usuario.id(), request.localidadeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(AvisoDto.Response.de(salvo));
    }

    @GetMapping
    public List<AvisoDto.Response> findAll(@RequestParam Long localidadeId,
                                           @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return avisoService.findVigentesByLocalidade(usuario.id(), localidadeId).stream()
                .map(AvisoDto.Response::de).toList();
    }
}
