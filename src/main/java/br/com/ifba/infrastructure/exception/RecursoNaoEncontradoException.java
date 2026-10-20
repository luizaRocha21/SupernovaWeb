package br.com.ifba.infrastructure.exception;

/** Recurso inexistente (HTTP 404). */
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
