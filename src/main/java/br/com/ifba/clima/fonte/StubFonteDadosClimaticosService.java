package br.com.ifba.clima.fonte;

import br.com.ifba.localidade.entity.Localidade;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Fonte SINTÉTICA para desenvolvimento e testes manuais. Os números são fictícios e
 * NÃO representam a chuva real de nenhuma localidade. Substituir antes de qualquer uso real.
 */
@Component
@ConditionalOnProperty(name = "app.clima.fonte", havingValue = "stub", matchIfMissing = true)
public class StubFonteDadosClimaticosService implements FonteDadosClimaticosService {

    /** Perfil sazonal fictício, janeiro a dezembro (estação chuvosa de novembro a março). */
    private static final double[] NORMAIS_FICTICIAS = {95, 80, 90, 55, 20, 10, 8, 6, 12, 35, 85, 110};

    @Override
    public String nomeFonte() {
        return "STUB-SINTETICO (dados fictícios de desenvolvimento)";
    }

    @Override
    public List<NormalClimatologica> serieHistorica(Localidade localidade) {
        List<NormalClimatologica> normais = new ArrayList<>();
        for (int mes = 1; mes <= 12; mes++) {
            normais.add(new NormalClimatologica(mes, NORMAIS_FICTICIAS[mes - 1], 30));
        }
        return normais;
    }

    @Override
    public List<ChuvaObservada> chuvaRecente(Localidade localidade, LocalDate de, LocalDate ate) {
        List<ChuvaObservada> chuvas = new ArrayList<>();
        for (LocalDate dia = de; !dia.isAfter(ate); dia = dia.plusDays(1)) {
            Random sorteio = new Random(localidade.getId() * 1_000_003L + dia.toEpochDay());
            double normalDoMes = NORMAIS_FICTICIAS[dia.getMonthValue() - 1];
            double probabilidade = Math.min(0.6, normalDoMes / (dia.lengthOfMonth() * 12.0));
            if (sorteio.nextDouble() < probabilidade) {
                double mm = Math.round((2 + sorteio.nextDouble() * 28) * 10) / 10.0;
                chuvas.add(new ChuvaObservada(dia, mm));
            }
        }
        return chuvas;
    }
}
