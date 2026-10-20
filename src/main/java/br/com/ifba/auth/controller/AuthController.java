package br.com.ifba.auth.controller;

import br.com.ifba.auth.dto.AuthDto;
import br.com.ifba.auth.service.AuthIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthIService authService;

    @PostMapping("/login")
    public AuthDto.LoginResponse login(@Valid @RequestBody AuthDto.LoginRequest request) {
        return authService.login(request.telefone(), request.senha());
    }
}
