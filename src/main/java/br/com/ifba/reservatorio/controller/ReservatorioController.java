package br.com.ifba.reservatorio.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.reservatorio.dto.ReservatorioDto;
import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.entity.Reservatorio;
import br.com.ifba.reservatorio.service.ReservatorioIService;
import br.com.ifba.sync.dto.ResultadoGravacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reservatorios")
@RequiredArgsConstructor
public class ReservatorioController {

    private final ReservatorioIService reservatorioService;

    @PostMapping
    public ResponseEntity<ReservatorioDto.Response> save(@Valid @RequestBody ReservatorioDto.Request request,
                                                         @AuthenticationPrincipal UsuarioAutenticado usuario) {
        Reservatorio salvo = reservatorioService.save(request.toEntity(), usuario.id(), request.localidadeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservatorioDto.Response.de(salvo));
    }

    /** Lista apenas os reservatórios do próprio usuário. */
    @GetMapping
    public List<ReservatorioDto.Response> findAll(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return reservatorioService.findByResponsavelId(usuario.id()).stream()
                .map(ReservatorioDto.Response::de).toList();
    }

    @PostMapping("/{id}/niveis")
    public ResponseEntity<ReservatorioDto.NivelResponse> saveNivel(@PathVariable Long id,
                                                                   @Valid @RequestBody ReservatorioDto.NivelRequest request,
                                                                   @AuthenticationPrincipal UsuarioAutenticado usuario) {
        ResultadoGravacao<RegistroNivel> resultado = reservatorioService.saveNivel(id, usuario.id(), request.toEntity());
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservatorioDto.NivelResponse.de(id, resultado));
    }
}
