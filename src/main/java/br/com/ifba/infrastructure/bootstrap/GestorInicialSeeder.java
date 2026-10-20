package br.com.ifba.infrastructure.bootstrap;

import br.com.ifba.infrastructure.config.BootstrapProperties;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.entity.TipoLocalidade;
import br.com.ifba.localidade.repository.LocalidadeRepository;
import br.com.ifba.usuario.entity.Abastecimento;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Cria o primeiro gestor público (necessário para cadastrar liderança, localidades e culturas).
 * Só age se BOOTSTRAP_GESTOR_TELEFONE e BOOTSTRAP_GESTOR_SENHA estiverem definidos e ainda não houver gestor.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GestorInicialSeeder implements ApplicationRunner {

    private final BootstrapProperties props;
    private final UsuarioRepository usuarioRepository;
    private final LocalidadeRepository localidadeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (props.gestorTelefone().isBlank() || props.gestorSenha().isBlank()) {
            return;
        }
        if (usuarioRepository.existsByPerfil(Perfil.GESTOR_PUBLICO)) {
            return;
        }
        Localidade municipio = localidadeRepository.findAll().stream()
                .filter(l -> l.getTipo() == TipoLocalidade.MUNICIPIO)
                .findFirst()
                .orElseGet(() -> {
                    Localidade nova = new Localidade();
                    nova.setNome(props.localidadeNome());
                    nova.setTipo(TipoLocalidade.MUNICIPIO);
                    return localidadeRepository.save(nova);
                });

        Usuario gestor = new Usuario();
        gestor.setNome(props.gestorNome());
        gestor.setTelefone(props.gestorTelefone());
        gestor.setSenhaHash(passwordEncoder.encode(props.gestorSenha()));
        gestor.setPerfil(Perfil.GESTOR_PUBLICO);
        gestor.setAbastecimento(Abastecimento.ENCANADA);
        gestor.setLocalidade(municipio);
        gestor.setConsentimentoLocalizacao(false);
        usuarioRepository.save(gestor);
        log.info("Gestor inicial criado localidadeId={}", municipio.getId());
    }
}
