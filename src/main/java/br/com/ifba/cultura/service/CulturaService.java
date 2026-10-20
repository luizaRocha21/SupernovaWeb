package br.com.ifba.cultura.service;

import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.entity.CulturaLimiarUsuario;
import br.com.ifba.cultura.repository.CulturaLimiarUsuarioRepository;
import br.com.ifba.cultura.repository.CulturaRepository;
import br.com.ifba.infrastructure.exception.ConflitoException;
import br.com.ifba.infrastructure.exception.RecursoNaoEncontradoException;
import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CulturaService implements CulturaIService {

    private final CulturaRepository culturaRepository;
    private final CulturaLimiarUsuarioRepository limiarUsuarioRepository;
    private final UsuarioIService usuarioService;

    @Override
    @Transactional
    public Cultura save(Cultura cultura) {
        validarLimiarPadrao(cultura);
        if (culturaRepository.existsByNomeIgnoreCase(cultura.getNome())) {
            throw new ConflitoException("Já existe uma cultura com este nome.");
        }
        log.info("Salvando cultura nome={}", cultura.getNome());
        return culturaRepository.save(cultura);
    }

    @Override
    @Transactional
    public Cultura update(Long id, Cultura dados) {
        validarLimiarPadrao(dados);
        Cultura existente = findById(id);
        existente.setNome(dados.getNome());
        existente.setTipoCriterio(dados.getTipoCriterio());
        existente.setLimiarPadraoMm(dados.getLimiarPadraoMm());
        existente.setJanelaDias(dados.getJanelaDias());
        existente.setFonteLimiar(dados.getFonteLimiar());
        log.info("Atualizando cultura id={}", id);
        return culturaRepository.save(existente);
    }

    @Override
    public List<Cultura> findAll() {
        return culturaRepository.findAll();
    }

    @Override
    public Cultura findById(Long id) {
        return culturaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cultura não encontrada."));
    }

    @Override
    public Cultura findByNome(String nome) {
        return culturaRepository.findByNomeIgnoreCase(nome)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cultura não encontrada."));
    }

    /** RN09: o agricultor pode sobrescrever o limiar, sem bloqueio. */
    @Override
    @Transactional
    public CulturaLimiarUsuario saveLimiarUsuario(Long usuarioId, Long culturaId, Double limiarMm) {
        if (limiarMm == null || limiarMm <= 0) {
            throw new RegraNegocioException("Informe um limiar de chuva maior que zero.");
        }
        CulturaLimiarUsuario registro = limiarUsuarioRepository.findByUsuarioIdAndCulturaId(usuarioId, culturaId)
                .orElseGet(CulturaLimiarUsuario::new);
        if (registro.getId() == null) {
            registro.setUsuario(usuarioService.findById(usuarioId));
            registro.setCultura(findById(culturaId));
        }
        registro.setLimiarMm(limiarMm);
        log.info("Salvando limiar personalizado usuarioId={} culturaId={}", usuarioId, culturaId);
        return limiarUsuarioRepository.save(registro);
    }

    @Override
    public LimiarEfetivo findLimiarEfetivo(Long usuarioId, Cultura cultura) {
        return limiarUsuarioRepository.findByUsuarioIdAndCulturaId(usuarioId, cultura.getId())
                .map(l -> new LimiarEfetivo(l.getLimiarMm(), "Limiar definido pelo próprio agricultor", true))
                .orElseGet(() -> new LimiarEfetivo(cultura.getLimiarPadraoMm(), cultura.getFonteLimiar(), false));
    }

    private void validarLimiarPadrao(Cultura cultura) {
        if (cultura.getLimiarPadraoMm() == null || cultura.getLimiarPadraoMm() <= 0) { // RN09
            throw new RegraNegocioException("Toda cultura precisa de um limiar mínimo de chuva maior que zero.");
        }
        if (cultura.getFonteLimiar() == null || cultura.getFonteLimiar().isBlank()) { // RN09
            throw new RegraNegocioException("Registre a fonte agronômica do limiar da cultura.");
        }
    }
}
