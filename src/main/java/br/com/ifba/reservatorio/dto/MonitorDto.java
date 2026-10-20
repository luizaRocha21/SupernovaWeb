package br.com.ifba.reservatorio.dto;

import br.com.ifba.reservatorio.entity.EscalaNivel;

import java.time.LocalDateTime;
import java.util.Map;

public final class MonitorDto {

    private MonitorDto() {
    }

    /**
     * RF08 agregado (RN15). Nunca traz nome, telefone nem dado individual: só contagens por escala.
     * Quando a localidade não atinge o mínimo de participantes, disponivel=false e nada é detalhado.
     */
    public record Monitor(Long localidadeId, boolean disponivel, int minimoNecessario, long participantesAtuais,
                          String mensagem, Integer totalReservatorios, Map<EscalaNivel, Long> distribuicao,
                          Double percentualBaixoOuCritico, LocalDateTime ultimaSincronizacao) {

        public static Monitor indisponivel(Long localidadeId, int minimo, long participantes) {
            return new Monitor(localidadeId, false, minimo, participantes,
                    "Ainda não há participantes suficientes nesta localidade para mostrar o panorama coletivo. "
                            + "Isso protege a privacidade das famílias.",
                    null, null, null, null);
        }
    }
}
