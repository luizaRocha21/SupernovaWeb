package br.com.ifba.auth.dto;

import br.com.ifba.usuario.entity.Perfil;
import jakarta.validation.constraints.NotBlank;

public final class AuthDto {

    private AuthDto() {
    }

    public record LoginRequest(@NotBlank String telefone, @NotBlank String senha) {
    }

    public record LoginResponse(String token, String tipo, Long usuarioId, Perfil perfil, long expiraEmMinutos) {
    }
}
