package br.com.ifba.infrastructure.security;

import br.com.ifba.usuario.entity.Perfil;

/** Principal carregado a partir do JWT: apenas id e perfil (nenhum dado pessoal). */
public record UsuarioAutenticado(Long id, Perfil perfil) {
}
