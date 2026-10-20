package br.com.ifba.infrastructure.bootstrap;

import br.com.ifba.clima.service.IngestaoIService;
import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.entity.TipoCriterio;
import br.com.ifba.cultura.repository.CulturaRepository;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.entity.TipoLocalidade;
import br.com.ifba.localidade.repository.LocalidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Dados de DESENVOLVIMENTO (perfil "dev"). Os limiares abaixo são PLACEHOLDERS ilustrativos:
 * não têm base agronômica e devem ser substituídos por valores validados com técnico agrícola/extensionista.
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final String PLACEHOLDER =
            "PLACEHOLDER de desenvolvimento: validar com técnico agrícola ou extensionista";

    private final LocalidadeRepository localidadeRepository;
    private final CulturaRepository culturaRepository;
    private final IngestaoIService ingestaoService;

    @Override
    public void run(ApplicationArguments args) {
        if (localidadeRepository.count() == 0) {
            Localidade irece = localidade("Irecê", TipoLocalidade.MUNICIPIO, null);
            localidade("Povoado de exemplo A", TipoLocalidade.POVOADO, irece);
            localidade("Povoado de exemplo B", TipoLocalidade.POVOADO, irece);
        }
        if (culturaRepository.count() == 0) {
            cultura("milho", TipoCriterio.ACUMULADO_JANELA, 30, 120.0);
            cultura("mamona", TipoCriterio.ACUMULADO_JANELA, 30, 100.0);
            cultura("feijão", TipoCriterio.INICIO_ESTACAO, null, 150.0);
        }
        ingestaoService.ingerirTodas();
        log.info("Dados de desenvolvimento carregados (fonte sintética).");
    }

    private Localidade localidade(String nome, TipoLocalidade tipo, Localidade pai) {
        Localidade l = new Localidade();
        l.setNome(nome);
        l.setTipo(tipo);
        l.setPai(pai);
        return localidadeRepository.save(l);
    }

    private void cultura(String nome, TipoCriterio criterio, Integer janelaDias, double limiar) {
        Cultura c = new Cultura();
        c.setNome(nome);
        c.setTipoCriterio(criterio);
        c.setJanelaDias(janelaDias);
        c.setLimiarPadraoMm(limiar);
        c.setFonteLimiar(PLACEHOLDER);
        culturaRepository.save(c);
    }
}
