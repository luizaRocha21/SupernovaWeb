package br.com.ifba.painel.dto;

import br.com.ifba.painel.entity.NivelSugestao;
import br.com.ifba.painel.entity.SugestaoPlantio;

import java.time.LocalDateTime;

public final class SugestaoDto {

    private SugestaoDto() {
    }

    /** RF06/RN12/RN16: recomendação com dado, fonte, data e grau de confiança. */
    public record Response(Long id, Long localidadeId, String localidadeNome, String cultura,
                           NivelSugestao resultado, String mensagem,
                           Double dadoUsadoMm, Double referenciaMm,
                           String fonte, LocalDateTime dataDado, Double grauConfianca,
                           LocalDateTime geradaEm) {

        public static Response de(SugestaoPlantio s) {
            return new Response(s.getId(), s.getLocalidade().getId(), s.getLocalidade().getNome(),
                    s.getCultura().getNome(), s.getResultado(), s.getJustificativa(),
                    s.getDadoUsadoMm(), s.getReferenciaMm(), s.getFonteDado(), s.getDataDado(),
                    s.getGrauConfianca(), s.getCriadoEm());
        }
    }
}
