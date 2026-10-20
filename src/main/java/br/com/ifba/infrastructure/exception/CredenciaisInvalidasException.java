package br.com.ifba.infrastructure.exception;

/** Falha de autenticação (HTTP 401). A mensagem é propositalmente genérica. */
public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException() {
        super("Telefone ou senha incorretos.");
    }
}
