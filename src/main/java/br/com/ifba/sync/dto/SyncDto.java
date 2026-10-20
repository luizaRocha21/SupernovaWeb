package br.com.ifba.sync.dto;

import br.com.ifba.precipitacao.entity.FontePrecipitacao;
import br.com.ifba.reservatorio.entity.EscalaNivel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class SyncDto {

    private SyncDto() {
    }

    public enum TipoRegistro {
        NIVEL,
        PRECIPITACAO
    }

    /** Um item da fila de escrita do app. Campos usados dependem do tipo. */
    public record Item(
            @NotBlank @Size(max = 36) String idClienteSync,
            @NotNull TipoRegistro tipo,
            Long reservatorioId,
            @Min(0) @Max(100) Integer nivelPercentual,
            EscalaNivel escala,
            LocalDate dataRegistro,
            Long localidadeId,
            @PositiveOrZero Double volumeMm,
            FontePrecipitacao fonte,
            LocalDateTime registradoEmCliente) {
    }

    public record Lote(@NotEmpty @Size(max = 200) List<@Valid Item> registros) {
    }

    public record Resultado(String idClienteSync, StatusSync status, String mensagem) {
    }
}
