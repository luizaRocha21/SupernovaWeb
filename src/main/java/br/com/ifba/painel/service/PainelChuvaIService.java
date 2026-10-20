package br.com.ifba.painel.service;

import br.com.ifba.clima.entity.SerieHistorica;
import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.painel.dto.PainelDto;

import java.time.LocalDate;
import java.util.Optional;

public interface PainelChuvaIService {

    /** RF04: painel de chuva da localidade; compara com o limiar da cultura quando informada. */
    PainelDto.Painel consultar(Long localidadeId, String culturaNome, Long usuarioId);

    /** Chuva relevante para o critério de decisão da cultura (acumulado, evento ou início de estação). */
    PainelDto.MedidaChuva valorPorCriterio(Long localidadeId, Cultura cultura, LocalDate hoje);

    /** Normal do mês: da própria localidade ou, na falta, do município (fonte mais próxima). */
    Optional<SerieHistorica> findNormalDoMes(Localidade localidade, int mes);

    /** RN04: há série histórica suficiente para sugerir? */
    boolean historicoSuficiente(Localidade localidade, int mes);
}
