package br.com.ifba.precipitacao.controller;

import br.com.ifba.infrastructure.dto.PaginaResponse;
import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.precipitacao.dto.PrecipitacaoDto;
import br.com.ifba.precipitacao.entity.Precipitacao;
import br.com.ifba.precipitacao.service.PrecipitacaoIService;
import br.com.ifba.sync.dto.ResultadoGravacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/precipitacoes")
@RequiredArgsConstructor
public class PrecipitacaoController {

    private final PrecipitacaoIService precipitacaoService;

    @PostMapping
    public ResponseEntity<PrecipitacaoDto.Response> save(@Valid @RequestBody PrecipitacaoDto.Request request,
                                                         @AuthenticationPrincipal UsuarioAutenticado usuario) {
        ResultadoGravacao<Precipitacao> resultado =
                precipitacaoService.save(request.toEntity(), usuario.id(), request.localidadeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(PrecipitacaoDto.Response.de(resultado.registro()));
    }

    @GetMapping
    public PaginaResponse<PrecipitacaoDto.Response> findAll(
            @PageableDefault(size = 20, sort = "dataEvento", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UsuarioAutenticado usuario) {
        return PaginaResponse.de(precipitacaoService.findByUsuarioId(usuario.id(), pageable),
                PrecipitacaoDto.Response::de);
    }
}
