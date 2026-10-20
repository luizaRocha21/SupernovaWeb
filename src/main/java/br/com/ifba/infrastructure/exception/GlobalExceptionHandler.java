package br.com.ifba.infrastructure.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ApiError> naoEncontrado(RecursoNaoEncontradoException e) {
        log.warn("Recurso não encontrado: {}", e.getMessage());
        return montar(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<ApiError> regraNegocio(RegraNegocioException e) {
        log.warn("Regra de negócio violada: {}", e.getMessage());
        return montar(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
    }

    @ExceptionHandler(ConflitoException.class)
    public ResponseEntity<ApiError> conflito(ConflitoException e) {
        log.warn("Conflito: {}", e.getMessage());
        return montar(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(AcessoProibidoException.class)
    public ResponseEntity<ApiError> proibido(AcessoProibidoException e) {
        log.warn("Acesso proibido: {}", e.getMessage());
        return montar(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> semPermissao(AccessDeniedException e) {
        log.warn("Acesso negado por perfil");
        return montar(HttpStatus.FORBIDDEN, "Você não tem permissão para fazer isso.");
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<ApiError> credenciais(CredenciaisInvalidasException e) {
        log.warn("Falha de autenticação");
        return montar(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacao(MethodArgumentNotValidException e) {
        String detalhe = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Entrada inválida: {}", detalhe);
        return montar(HttpStatus.BAD_REQUEST, "Confira os campos informados. " + detalhe);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ApiError> requisicaoInvalida(Exception e) {
        log.warn("Requisição inválida: {}", e.getClass().getSimpleName());
        return montar(HttpStatus.BAD_REQUEST, "Não foi possível entender a requisição. Confira os dados enviados.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> metodoNaoSuportado(HttpRequestMethodNotSupportedException e) {
        return montar(HttpStatus.METHOD_NOT_ALLOWED, "Operação não permitida para este endereço.");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> semRecurso(NoResourceFoundException e) {
        return montar(HttpStatus.NOT_FOUND, "Endereço não encontrado.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> inesperado(Exception e) {
        log.error("Falha inesperada", e);
        return montar(HttpStatus.INTERNAL_SERVER_ERROR, "Tivemos um problema. Tente novamente em instantes.");
    }

    private ResponseEntity<ApiError> montar(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(ApiError.de(status.value(), mensagem));
    }
}
