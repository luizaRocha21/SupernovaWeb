package br.com.ifba.localidade.service;

import br.com.ifba.infrastructure.exception.RecursoNaoEncontradoException;
import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.entity.TipoLocalidade;
import br.com.ifba.localidade.repository.LocalidadeRepository;
import br.com.ifba.usuario.entity.Usuario;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LocalidadeService implements LocalidadeIService {

    private final LocalidadeRepository localidadeRepository;

    @Override
    @Transactional
    public Localidade save(Localidade localidade, Long paiId) {
        if (localidade.getTipo() == TipoLocalidade.POVOADO) {
            if (paiId == null) {
                throw new RegraNegocioException("Um povoado precisa estar ligado a um município.");
            }
            Localidade pai = findById(paiId);
            if (pai.getTipo() != TipoLocalidade.MUNICIPIO) {
                throw new RegraNegocioException("O povoado deve ser ligado a um município.");
            }
            localidade.setPai(pai);
        } else if (paiId != null) {
            throw new RegraNegocioException("Um município não pode ter localidade pai.");
        }
        log.info("Salvando localidade tipo={}", localidade.getTipo());
        return localidadeRepository.save(localidade);
    }

    @Override
    public List<Localidade> findAll() {
        return localidadeRepository.findAll();
    }

    @Override
    public Localidade findById(Long id) {
        return localidadeRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Localidade não encontrada."));
    }

    @Override
    public List<Localidade> findByPaiId(Long paiId) {
        return localidadeRepository.findByPaiId(paiId);
    }

    @Override
    public boolean podeAcessar(Usuario usuario, Long localidadeId) {
        Localidade propria = usuario.getLocalidade();
        if (propria.getId().equals(localidadeId)) {
            return true;
        }
        return propria.getPai() != null && propria.getPai().getId().equals(localidadeId);
    }

    @Override
    public List<Long> findIdsComDescendentes(Long localidadeId) {
        List<Long> ids = new ArrayList<>();
        ids.add(localidadeId);
        localidadeRepository.findByPaiId(localidadeId).forEach(filha -> ids.add(filha.getId()));
        return ids;
    }
}
