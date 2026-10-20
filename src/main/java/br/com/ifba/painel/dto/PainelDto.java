package br.com.ifba.painel.dto;

import br.com.ifba.cultura.entity.TipoCriterio;

import java.time.LocalDateTime;

public final class PainelDto {

    private PainelDto() {
    }

    /** Medida de chuva num período, com a origem do dado (RN16). */
    public record MedidaChuva(double valorMm, boolean fonteExterna, boolean temDados, String fonte,
                              LocalDateTime atualizadoEm) {
    }

    public record ComparacaoCultura(String cultura, TipoCriterio criterio, Double valorAtualMm, Double limiarMm,
                                    String fonteLimiar, boolean limiarPersonalizado, boolean limiarAtingido) {
    }

    /** RF04. Toda resposta traz fonte e atualizadoEm (RN16). */
    public record Painel(Long localidadeId, String localidadeNome, int ano, int mes,
                         Double acumuladoMesMm, Double normalMesMm, Double percentualDaNormal,
                         Double acumuladoEstacaoMm, Double maiorChuvaRecenteMm,
                         boolean historicoSuficiente, String resumo,
                         String fonte, LocalDateTime atualizadoEm,
                         ComparacaoCultura comparacaoCultura) {
    }
}
