package br.com.ifba.precipitacao.service;

import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.precipitacao.entity.Precipitacao;
import br.com.ifba.precipitacao.repository.PrecipitacaoRepository;
import br.com.ifba.sync.dto.ResultadoGravacao;
import br.com.ifba.sync.dto.StatusSync;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrecipitacaoService implements PrecipitacaoIService {

    private final PrecipitacaoRepository precipitacaoRepository;
    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final Clock clock;

    @Override
    @Transactional
    public ResultadoGravacao<Precipitacao> save(Precipitacao precipitacao, Long usuarioId, Long localidadeId) {
        // RN13: o mesmo idClienteSync nunca grava duas vezes
        if (precipitacao.getIdClienteSync() != null) {
            Optional<Precipitacao> existente = precipitacaoRepository.findByIdClienteSync(precipitacao.getIdClienteSync());
            if (existente.isPresent()) {
                log.info("Registro de chuva duplicado ignorado (idempotência)");
                return new ResultadoGravacao<>(existente.get(), StatusSync.DUPLICADO);
            }
        }
        if (precipitacao.getVolumeMm() == null || precipitacao.getVolumeMm() < 0) {
            throw new RegraNegocioException("Informe um volume de chuva igual ou maior que zero.");
        }
        LocalDate hoje = LocalDate.now(clock);
        if (precipitacao.getDataEvento() == null) {
            precipitacao.setDataEvento(hoje);
        }
        if (precipitacao.getDataEvento().isAfter(hoje)) {
            throw new RegraNegocioException("A data da chuva não pode estar no futuro.");
        }
        Usuario usuario = usuarioService.findById(usuarioId);
        Localidade localidade = localidadeId != null ? localidadeService.findById(localidadeId) : usuario.getLocalidade();
        precipitacao.setUsuario(usuario);
        precipitacao.setLocalidade(localidade);
        log.info("Salvando registro de chuva localidadeId={} volumeMm={}", localidade.getId(), precipitacao.getVolumeMm());
        return new ResultadoGravacao<>(precipitacaoRepository.save(precipitacao), StatusSync.CRIADO);
    }

    @Override
    public Page<Precipitacao> findByUsuarioId(Long usuarioId, Pageable pageable) {
        return precipitacaoRepository.findByUsuarioId(usuarioId, pageable);
    }
}
