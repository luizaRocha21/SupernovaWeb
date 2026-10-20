package br.com.ifba.sync.dto;

public record ResultadoGravacao<T>(T registro, StatusSync status) {
}
