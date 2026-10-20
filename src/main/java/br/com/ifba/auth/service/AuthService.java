package br.com.ifba.auth.service;

import br.com.ifba.auth.dto.AuthDto;
import br.com.ifba.infrastructure.config.JwtProperties;
import br.com.ifba.infrastructure.exception.CredenciaisInvalidasException;
import br.com.ifba.infrastructure.security.JwtService;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService implements AuthIService {

    private final UsuarioIService usuarioService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    @Override
    public AuthDto.LoginResponse login(String telefone, String senha) {
        Usuario usuario = usuarioService.findByTelefone(telefone)
                .orElseThrow(CredenciaisInvalidasException::new);
        if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
            throw new CredenciaisInvalidasException();
        }
        log.info("Login realizado usuarioId={}", usuario.getId());
        return new AuthDto.LoginResponse(jwtService.gerar(usuario), "Bearer", usuario.getId(),
                usuario.getPerfil(), jwtProperties.expiracaoMinutos());
    }
}
