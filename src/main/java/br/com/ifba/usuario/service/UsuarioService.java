package br.com.ifba.usuario.service;

import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.infrastructure.exception.ConflitoException;
import br.com.ifba.infrastructure.exception.RecursoNaoEncontradoException;
import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService implements UsuarioIService {

    private final UsuarioRepository usuarioRepository;
    private final LocalidadeIService localidadeService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Usuario save(Usuario usuario, String senhaPlana, Long localidadeId, UsuarioAutenticado solicitante) {
        // Perfis com poder de emitir alertas/consultar agregados não podem ser autoatribuídos.
        boolean perfilRestrito = usuario.getPerfil() != Perfil.AGRICULTOR;
        boolean solicitanteEhGestor = solicitante != null && solicitante.perfil() == Perfil.GESTOR_PUBLICO;
        if (perfilRestrito && !solicitanteEhGestor) {
            log.warn("Tentativa de cadastro de perfil restrito sem autorização perfil={}", usuario.getPerfil());
            throw new AcessoProibidoException("Somente um gestor público pode cadastrar este tipo de perfil.");
        }
        if (usuarioRepository.existsByTelefone(usuario.getTelefone())) {
            throw new ConflitoException("Já existe um cadastro com este telefone.");
        }
        usuario.setLocalidade(localidadeService.findById(localidadeId));
        usuario.setSenhaHash(passwordEncoder.encode(senhaPlana));
        log.info("Salvando novo usuário perfil={} localidadeId={}", usuario.getPerfil(), localidadeId);
        return usuarioRepository.save(usuario);
    }

    @Override
    public Usuario findById(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
    }

    @Override
    public Optional<Usuario> findByTelefone(String telefone) {
        return usuarioRepository.findByTelefone(telefone);
    }
}
