package br.com.ifba.localidade.controller;

import br.com.ifba.localidade.dto.LocalidadeDto;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1/localidades")
@RequiredArgsConstructor
public class LocalidadeController {

    private final LocalidadeIService localidadeService;

    @PostMapping
    @PreAuthorize("hasRole('GESTOR_PUBLICO')")
    public ResponseEntity<LocalidadeDto.Response> save(@Valid @RequestBody LocalidadeDto.Request request) {
        Localidade salva = localidadeService.save(request.toEntity(), request.paiId());
        return ResponseEntity.status(HttpStatus.CREATED).body(LocalidadeDto.Response.de(salva));
    }

    @GetMapping
    public ResponseEntity<List<LocalidadeDto.Response>> findAll() {
        List<LocalidadeDto.Response> corpo = localidadeService.findAll().stream()
                .map(LocalidadeDto.Response::de).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate()).body(corpo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LocalidadeDto.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate())
                .body(LocalidadeDto.Response.de(localidadeService.findById(id)));
    }
}
