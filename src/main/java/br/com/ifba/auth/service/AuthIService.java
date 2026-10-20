package br.com.ifba.auth.service;

import br.com.ifba.auth.dto.AuthDto;

public interface AuthIService {

    /** RF02: autentica por telefone e senha e devolve um JWT com expiração. */
    AuthDto.LoginResponse login(String telefone, String senha);
}
