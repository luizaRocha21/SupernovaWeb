package br.com.ifba.cultura.dto;

import br.com.ifba.cultura.entity.Cultura;
import br.com.ifba.cultura.entity.TipoCriterio;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class CulturaDto {

    private CulturaDto() {
    }

    public record Request(
            @NotBlank @Size(max = 60) String nome,
            @NotNull TipoCriterio tipoCriterio,
            @NotNull @Positive Double limiarPadraoMm,
            @Positive Integer janelaDias,
            @NotBlank @Size(max = 300) String fonteLimiar) {

        public Cultura toEntity() {
            Cultura c = new Cultura();
            c.setNome(nome);
            c.setTipoCriterio(tipoCriterio);
            c.setLimiarPadraoMm(limiarPadraoMm);
            c.setJanelaDias(janelaDias);
            c.setFonteLimiar(fonteLimiar);
            return c;
        }
    }

    public record Response(Long id, String nome, TipoCriterio tipoCriterio, Double limiarPadraoMm,
                           Integer janelaDias, String fonteLimiar) {

        public static Response de(Cultura c) {
            return new Response(c.getId(), c.getNome(), c.getTipoCriterio(), c.getLimiarPadraoMm(),
                    c.getJanelaDias(), c.getFonteLimiar());
        }
    }

    public record LimiarUsuarioRequest(@NotNull @Positive Double limiarMm) {
    }

    public record LimiarUsuarioResponse(Long culturaId, Double limiarMm, boolean personalizado) {
    }
}
