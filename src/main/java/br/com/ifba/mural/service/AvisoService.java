package br.com.ifba.mural.service;

import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.mural.entity.Aviso;
import br.com.ifba.mural.repository.AvisoRepository;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@ConditionalOnProperty(prefix = "app.features", name = "mural", havingValue = "true")
public class AvisoService implements AvisoIService {

    private static final int DIAS_DE_VIGENCIA = 30; // RN08

    private final AvisoRepository avisoRepository;
    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final Clock clock;

    @Override
    @Transactional
    public Aviso save(Aviso aviso, Long autorId, Long localidadeId) {
        Usuario autor = usuarioService.findById(autorId);
        if (autor.getPerfil() != Perfil.LIDERANCA_COMUNITARIA) {
            throw new AcessoProibidoException("Somente a liderança comunitária publica no mural.");
        }
        if (!localidadeService.podeAcessar(autor, localidadeId)) {
            throw new AcessoProibidoException("Você só pode publicar no mural da sua localidade.");
        }
        aviso.setAutor(autor);
        aviso.setLocalidade(localidadeService.findById(localidadeId));
        log.info("Salvando aviso do mural localidadeId={}", localidadeId);
        return avisoRepository.save(aviso);
    }

    @Override
    public List<Aviso> findVigentesByLocalidade(Long usuarioId, Long localidadeId) {
        Usuario usuario = usuarioService.findById(usuarioId);
        if (!localidadeService.podeAcessar(usuario, localidadeId)) {
            throw new AcessoProibidoException("Você só pode ver o mural da sua localidade.");
        }
        return avisoRepository.findByLocalidadeIdAndCriadoEmAfterOrderByCriadoEmDesc(
                localidadeId, LocalDateTime.now(clock).minusDays(DIAS_DE_VIGENCIA));
    }
}
