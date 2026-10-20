package br.com.ifba.alerta.service;

import br.com.ifba.alerta.entity.Alerta;
import br.com.ifba.alerta.repository.AlertaRepository;
import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AlertaService implements AlertaIService {

    private final AlertaRepository alertaRepository;
    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final Clock clock;

    @Override
    @Transactional
    public Alerta save(Alerta alerta, Long emissorId, Long localidadeId) {
        Usuario emissor = usuarioService.findById(emissorId);
        if (emissor.getPerfil() == Perfil.AGRICULTOR) { // RF12: restrição de quem emite
            log.warn("Emissão de alerta negada ao perfil AGRICULTOR");
            throw new AcessoProibidoException("Somente liderança comunitária ou gestor público emite alertas.");
        }
        if (!localidadeService.podeAcessar(emissor, localidadeId)) {
            throw new AcessoProibidoException("Você só pode emitir alertas para a sua localidade.");
        }
        if (!alerta.getVigenciaFim().isAfter(alerta.getVigenciaInicio())) {
            throw new RegraNegocioException("O fim da vigência deve ser depois do início.");
        }
        Localidade localidade = localidadeService.findById(localidadeId);
        alerta.setLocalidade(localidade);
        alerta.setEmitidoPor(emissor);
        log.info("Salvando alerta tipo={} localidadeId={}", alerta.getTipo(), localidadeId);
        return alertaRepository.save(alerta);
    }

    @Override
    public List<Alerta> findVigentesByLocalidade(Long usuarioId, Long localidadeId) {
        Usuario usuario = usuarioService.findById(usuarioId);
        if (!localidadeService.podeAcessar(usuario, localidadeId)) { // RN07
            throw new AcessoProibidoException("Você só pode ver alertas da sua localidade.");
        }
        return alertaRepository.findVigentes(localidadeId, LocalDateTime.now(clock));
    }
}
