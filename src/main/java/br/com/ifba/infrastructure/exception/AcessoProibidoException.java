package br.com.ifba.infrastructure.exception;

/** Usuário autenticado sem permissão para a operação (HTTP 403). */
public class AcessoProibidoException extends RuntimeException {

    public AcessoProibidoException(String mensagem) {
        super(mensagem);
    }
}
