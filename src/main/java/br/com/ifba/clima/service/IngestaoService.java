package br.com.ifba.clima.service;

import br.com.ifba.clima.dto.IngestaoDto;
import br.com.ifba.clima.entity.ObservacaoExterna;
import br.com.ifba.clima.entity.SerieHistorica;
import br.com.ifba.clima.fonte.ChuvaObservada;
import br.com.ifba.clima.fonte.FonteDadosClimaticosService;
import br.com.ifba.clima.fonte.NormalClimatologica;
import br.com.ifba.clima.repository.ObservacaoExternaRepository;
import br.com.ifba.clima.repository.SerieHistoricaRepository;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.service.LocalidadeIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestaoService implements IngestaoIService {

    /** Janela de chuva recente carregada a cada ingestão (cobre o início da estação chuvosa). */
    private static final int DIAS_OBSERVACAO = 180;

    private final FonteDadosClimaticosService fonte;
    private final LocalidadeIService localidadeService;
    private final SerieHistoricaRepository serieRepository;
    private final ObservacaoExternaRepository observacaoRepository;
    private final Clock clock;

    @Override
    @Transactional
    public IngestaoDto.Resultado ingerir(Long localidadeId) {
        Localidade localidade = localidadeService.findById(localidadeId);
        LocalDateTime agora = LocalDateTime.now(clock);
        LocalDate hoje = LocalDate.now(clock);
        log.info("Ingerindo dados climáticos localidadeId={} fonte={}", localidadeId, fonte.nomeFonte());

        int normais = 0;
        for (NormalClimatologica n : fonte.serieHistorica(localidade)) {
            SerieHistorica serie = serieRepository.findByLocalidadeIdAndMes(localidadeId, n.mes())
                    .orElseGet(SerieHistorica::new);
            serie.setLocalidade(localidade);
            serie.setMes(n.mes());
            serie.setNormalMm(n.normalMm());
            serie.setAnosBase(n.anosBase());
            serie.setFonte(fonte.nomeFonte());
            serie.setFonteAtualizadaEm(agora);
            serieRepository.save(serie);
            normais++;
        }

        int observacoes = 0;
        for (ChuvaObservada c : fonte.chuvaRecente(localidade, hoje.minusDays(DIAS_OBSERVACAO), hoje)) {
            ObservacaoExterna obs = observacaoRepository
                    .findByLocalidadeIdAndDataObservacaoAndFonte(localidadeId, c.data(), fonte.nomeFonte())
                    .orElseGet(ObservacaoExterna::new);
            obs.setLocalidade(localidade);
            obs.setDataObservacao(c.data());
            obs.setValorMm(c.mm());
            obs.setFonte(fonte.nomeFonte());
            obs.setFonteAtualizadaEm(agora);
            observacaoRepository.save(obs);
            observacoes++;
        }
        return new IngestaoDto.Resultado(localidadeId, normais, observacoes, fonte.nomeFonte());
    }

    @Override
    @Transactional
    public List<IngestaoDto.Resultado> ingerirTodas() {
        List<IngestaoDto.Resultado> resultados = new ArrayList<>();
        for (Localidade localidade : localidadeService.findAll()) {
            try {
                resultados.add(ingerir(localidade.getId()));
            } catch (RuntimeException e) {
                log.error("Falha na ingestão localidadeId={}", localidade.getId(), e);
            }
        }
        return resultados;
    }
}
