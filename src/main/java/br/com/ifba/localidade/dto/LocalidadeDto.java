package br.com.ifba.localidade.dto;

import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.localidade.entity.TipoLocalidade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class LocalidadeDto {

    private LocalidadeDto() {
    }

    public record Request(
            @NotBlank @Size(max = 120) String nome,
            @NotNull TipoLocalidade tipo,
            Long paiId,
            Double latitude,
            Double longitude) {

        public Localidade toEntity() {
            Localidade l = new Localidade();
            l.setNome(nome);
            l.setTipo(tipo);
            l.setLatitude(latitude);
            l.setLongitude(longitude);
            return l;
        }
    }

    public record Response(Long id, String nome, TipoLocalidade tipo, Long paiId, Double latitude, Double longitude) {

        public static Response de(Localidade l) {
            return new Response(l.getId(), l.getNome(), l.getTipo(),
                    l.getPai() != null ? l.getPai().getId() : null, l.getLatitude(), l.getLongitude());
        }
    }
}
