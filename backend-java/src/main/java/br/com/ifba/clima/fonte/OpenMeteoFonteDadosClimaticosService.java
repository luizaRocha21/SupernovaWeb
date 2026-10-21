package br.com.ifba.clima.fonte;

import br.com.ifba.localidade.entity.Localidade;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Implementação REAL da fonte de dados climáticos (RF18) para o Território de Irecê - BA.
 * Consulta a API meteorológica Open-Meteo (integrada a modelos globais e reanálise ERA5/CHIRPS)
 * nas coordenadas geográficas de Irecê, Presidente Dutra e povoados.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.clima.fonte", havingValue = "open-meteo")
public class OpenMeteoFonteDadosClimaticosService implements FonteDadosClimaticosService {

    /** Normais climatológicas mensais de 30 anos (1991-2020) INMET/CHIRPS para a microrregião de Irecê (mm). */
    private static final double[] NORMAIS_IRECE_MM = {95.0, 82.0, 92.0, 54.0, 18.0, 9.0, 7.0, 5.0, 12.0, 38.0, 88.0, 112.0};

    private static final Map<String, double[]> COORDENADAS_TERRITORIO = Map.of(
            "irecê", new double[]{-11.3042, -41.8558},
            "presidente dutra", new double[]{-11.2958, -41.9869},
            "povoado de achado", new double[]{-11.2610, -41.8210},
            "povoado de umbuzeiro", new double[]{-11.3412, -41.8840},
            "povoado de campo formoso", new double[]{-11.3120, -41.9650}
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    @Override
    public String nomeFonte() {
        return "Open-Meteo / Climatologia INMET-CHIRPS (Território de Irecê - BA)";
    }

    @Override
    public List<NormalClimatologica> serieHistorica(Localidade localidade) {
        List<NormalClimatologica> normais = new ArrayList<>();
        for (int mes = 1; mes <= 12; mes++) {
            normais.add(new NormalClimatologica(mes, NORMAIS_IRECE_MM[mes - 1], 30));
        }
        return normais;
    }

    @Override
    public List<ChuvaObservada> chuvaRecente(Localidade localidade, LocalDate de, LocalDate ate) {
        double[] coords = resolverCoordenadas(localidade.getNome());
        String url = String.format(
                "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&daily=precipitation_sum&timezone=America%%2FBahia&start_date=%s&end_date=%s",
                coords[0], coords[1], de, ate
        );

        List<ChuvaObservada> resultado = new ArrayList<>();
        try {
            String body = restClient.get().uri(url).retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode daily = root.path("daily");
            JsonNode times = daily.path("time");
            JsonNode precip = daily.path("precipitation_sum");

            if (times.isArray() && precip.isArray()) {
                for (int i = 0; i < times.size(); i++) {
                    LocalDate dia = LocalDate.parse(times.get(i).asText());
                    double mm = precip.get(i).isNull() ? 0.0 : precip.get(i).asDouble(0.0);
                    if (mm >= 0.0) {
                        resultado.add(new ChuvaObservada(dia, Math.round(mm * 10.0) / 10.0));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao consultar Open-Meteo para localidade={}: {}", localidade.getNome(), e.getMessage());
        }
        return resultado;
    }

    private double[] resolverCoordenadas(String nomeLocalidade) {
        if (nomeLocalidade == null) return new double[]{-11.3042, -41.8558};
        String chave = nomeLocalidade.toLowerCase();
        for (Map.Entry<String, double[]> entry : COORDENADAS_TERRITORIO.entrySet()) {
            if (chave.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return new double[]{-11.3042, -41.8558};
    }
}
