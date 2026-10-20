package br.com.ifba.alerta.dto;

import br.com.ifba.alerta.entity.Alerta;
import br.com.ifba.alerta.entity.Severidade;
import br.com.ifba.alerta.entity.TipoAlerta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class AlertaDto {

    private AlertaDto() {
    }

    public record Request(
            @NotNull Long localidadeId,
            @NotNull TipoAlerta tipo,
            @NotNull Severidade severidade,
            @NotBlank @Size(max = 300) String mensagem,
            @NotNull LocalDateTime vigenciaInicio,
            @NotNull LocalDateTime vigenciaFim) {

        public Alerta toEntity() {
            Alerta a = new Alerta();
            a.setTipo(tipo);
            a.setSeveridade(severidade);
            a.setMensagem(mensagem);
            a.setVigenciaInicio(vigenciaInicio);
            a.setVigenciaFim(vigenciaFim);
            return a;
        }
    }

    public record Response(Long id, Long localidadeId, TipoAlerta tipo, Severidade severidade, String mensagem,
                           LocalDateTime vigenciaInicio, LocalDateTime vigenciaFim) {

        public static Response de(Alerta a) {
            return new Response(a.getId(), a.getLocalidade().getId(), a.getTipo(), a.getSeveridade(),
                    a.getMensagem(), a.getVigenciaInicio(), a.getVigenciaFim());
        }
    }
}
