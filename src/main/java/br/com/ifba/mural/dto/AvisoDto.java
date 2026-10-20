package br.com.ifba.mural.dto;

import br.com.ifba.mural.entity.Aviso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class AvisoDto {

    private AvisoDto() {
    }

    public record Request(@NotNull Long localidadeId, @NotBlank @Size(max = 120) String titulo,
                          @NotBlank @Size(max = 500) String descricao) {

        public Aviso toEntity() {
            Aviso a = new Aviso();
            a.setTitulo(titulo);
            a.setDescricao(descricao);
            return a;
        }
    }

    public record Response(Long id, Long localidadeId, String titulo, String descricao, LocalDateTime publicadoEm) {

        public static Response de(Aviso a) {
            return new Response(a.getId(), a.getLocalidade().getId(), a.getTitulo(), a.getDescricao(), a.getCriadoEm());
        }
    }
}
