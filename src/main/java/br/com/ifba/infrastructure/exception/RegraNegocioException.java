package br.com.ifba.infrastructure.exception;

/** Regra de negócio violada (HTTP 422). */
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
