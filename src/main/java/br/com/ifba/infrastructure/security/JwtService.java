package br.com.ifba.infrastructure.security;

import br.com.ifba.infrastructure.config.JwtProperties;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties props;

    @PostConstruct
    void validarSegredo() {
        if (props.secret() == null || props.secret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 caracteres.");
        }
    }

    public String gerar(Usuario usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(usuario.getId()))
                .claim("perfil", usuario.getPerfil().name())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(props.expiracaoMinutos(), ChronoUnit.MINUTES)))
                .signWith(chave())
                .compact();
    }

    public Optional<UsuarioAutenticado> validar(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(chave()).build()
                    .parseSignedClaims(token).getPayload();
            Long id = Long.valueOf(claims.getSubject());
            Perfil perfil = Perfil.valueOf(claims.get("perfil", String.class));
            return Optional.of(new UsuarioAutenticado(id, perfil));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Token JWT rejeitado");
            return Optional.empty();
        }
    }

    private SecretKey chave() {
        return Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
    }
}
