package br.com.ifba.clima.fonte;

import br.com.ifba.localidade.entity.Localidade;

import java.time.LocalDate;
import java.util.List;

/**
 * Ponto de troca da fonte de dados climáticos (RF18).
 * O sistema não depende de INMET, Cemaden, CHIRPS etc. diretamente: cada fonte real será uma
 * implementação desta interface, selecionada por app.clima.fonte.
 */
public interface FonteDadosClimaticosService {

    /** Nome legível da fonte, exibido ao usuário (RN16). */
    String nomeFonte();

    /** Normais climatológicas mensais da localidade. */
    List<NormalClimatologica> serieHistorica(Localidade localidade);

    /** Chuva diária observada no período (inclusive). */
    List<ChuvaObservada> chuvaRecente(Localidade localidade, LocalDate de, LocalDate ate);
}
