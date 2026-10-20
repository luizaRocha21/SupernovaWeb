package br.com.ifba.sync.dto;

/** Resultado da gravação de um registro (idempotência e conflito, RN02/RN13). */
public enum StatusSync {
    CRIADO,
    ATUALIZADO,
    DUPLICADO,
    DESCARTADO_MAIS_ANTIGO,
    ERRO
}
