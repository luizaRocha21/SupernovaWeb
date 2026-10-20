package br.com.ifba.usuario.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.usuario.dto.UsuarioDto;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioIService usuarioService;

    /** RF01. Endpoint público; perfis restritos exigem token de gestor (verificado no Service). */
    @PostMapping
    public ResponseEntity<UsuarioDto.Response> save(@Valid @RequestBody UsuarioDto.CadastroRequest request,
                                                    @AuthenticationPrincipal UsuarioAutenticado solicitante) {
        Usuario salvo = usuarioService.save(request.toEntity(), request.senha(), request.localidadeId(), solicitante);
        return ResponseEntity.status(HttpStatus.CREATED).body(UsuarioDto.Response.de(salvo));
    }

    @GetMapping("/me")
    public UsuarioDto.Response me(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return UsuarioDto.Response.de(usuarioService.findById(usuario.id()));
    }
}
