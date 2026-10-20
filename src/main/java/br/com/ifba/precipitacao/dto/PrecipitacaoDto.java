package br.com.ifba.precipitacao.dto;

import br.com.ifba.precipitacao.entity.FontePrecipitacao;
import br.com.ifba.precipitacao.entity.Precipitacao;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class PrecipitacaoDto {

    private PrecipitacaoDto() {
    }

    public record Request(
            Long localidadeId,
            @NotNull @PositiveOrZero Double volumeMm,
            LocalDate dataEvento,
            @NotNull FontePrecipitacao fonte,
            @Size(max = 36) String idClienteSync) {

        public Precipitacao toEntity() {
            Precipitacao p = new Precipitacao();
            p.setVolumeMm(volumeMm);
            p.setDataEvento(dataEvento);
            p.setFonte(fonte);
            p.setIdClienteSync(idClienteSync);
            return p;
        }
    }

    public record Response(Long id, Long localidadeId, String localidadeNome, Double volumeMm,
                           LocalDate dataEvento, FontePrecipitacao fonte) {

        public static Response de(Precipitacao p) {
            return new Response(p.getId(), p.getLocalidade().getId(), p.getLocalidade().getNome(),
                    p.getVolumeMm(), p.getDataEvento(), p.getFonte());
        }
    }
}
