package br.com.ifba.clima.dto;

public final class IngestaoDto {

    private IngestaoDto() {
    }

    public record Resultado(Long localidadeId, int normaisAtualizadas, int observacoesAtualizadas, String fonte) {
    }
}
