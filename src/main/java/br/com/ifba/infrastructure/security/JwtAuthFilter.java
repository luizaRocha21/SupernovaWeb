package br.com.ifba.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lê o Bearer token e popula o SecurityContext.
 * Não é um bean de propósito: instanciado no SecurityConfig para rodar só dentro da cadeia do Spring Security.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String cabecalho = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (cabecalho != null && cabecalho.startsWith("Bearer ")) {
            jwtService.validar(cabecalho.substring(7)).ifPresent(usuario -> {
                var autenticacao = new UsernamePasswordAuthenticationToken(usuario, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + usuario.perfil().name())));
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            });
        }
        chain.doFilter(request, response);
    }
}
