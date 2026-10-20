package br.com.ifba.reservatorio.dto;

import br.com.ifba.reservatorio.entity.EscalaNivel;
import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.entity.Reservatorio;
import br.com.ifba.reservatorio.entity.TipoReservatorio;
import br.com.ifba.sync.dto.ResultadoGravacao;
import br.com.ifba.sync.dto.StatusSync;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class ReservatorioDto {

    private ReservatorioDto() {
    }

    public record Request(@NotNull TipoReservatorio tipo, @Size(max = 80) String apelido, Long localidadeId) {

        public Reservatorio toEntity() {
            Reservatorio r = new Reservatorio();
            r.setTipo(tipo);
            r.setApelido(apelido);
            return r;
        }
    }

    public record Response(Long id, TipoReservatorio tipo, String apelido, Long localidadeId, String localidadeNome) {

        public static Response de(Reservatorio r) {
            return new Response(r.getId(), r.getTipo(), r.getApelido(),
                    r.getLocalidade().getId(), r.getLocalidade().getNome());
        }
    }

    /** Informe o percentual OU a escala. */
    public record NivelRequest(@Min(0) @Max(100) Integer nivelPercentual, EscalaNivel escala,
                               LocalDate dataRegistro, @Size(max = 36) String idClienteSync) {

        public RegistroNivel toEntity() {
            RegistroNivel n = new RegistroNivel();
            n.setNivelPercentual(nivelPercentual);
            n.setEscala(escala);
            n.setDataRegistro(dataRegistro);
            n.setIdClienteSync(idClienteSync);
            return n;
        }
    }

    public record NivelResponse(Long id, Long reservatorioId, Integer nivelPercentual, EscalaNivel escala,
                                LocalDate dataRegistro, StatusSync status) {

        public static NivelResponse de(Long reservatorioId, ResultadoGravacao<RegistroNivel> resultado) {
            RegistroNivel n = resultado.registro();
            return new NivelResponse(n.getId(), reservatorioId, n.getNivelPercentual(), n.getEscala(),
                    n.getDataRegistro(), resultado.status());
        }
    }
}
