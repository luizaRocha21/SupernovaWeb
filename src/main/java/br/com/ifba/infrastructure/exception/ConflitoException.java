package br.com.ifba.infrastructure.exception;

/** Conflito com dado já existente (HTTP 409). */
public class ConflitoException extends RuntimeException {

    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
