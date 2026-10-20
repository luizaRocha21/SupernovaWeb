package br.com.ifba.infrastructure.exception;

import java.time.LocalDateTime;

/** Resposta de erro padronizada: código, mensagem em português e timestamp. */
public record ApiError(int codigo, String mensagem, LocalDateTime timestamp) {

    public static ApiError de(int codigo, String mensagem) {
        return new ApiError(codigo, mensagem, LocalDateTime.now());
    }
}
