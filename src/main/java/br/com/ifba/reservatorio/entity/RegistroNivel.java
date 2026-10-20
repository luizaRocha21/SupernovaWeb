package br.com.ifba.reservatorio.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Nível do reservatório. RN02: um registro por reservatório por dia (garantido também por constraint). */
@Entity
@Table(name = "registro_nivel", uniqueConstraints = @UniqueConstraint(
        name = "uk_registro_reservatorio_dia", columnNames = {"reservatorio_id", "data_registro"}))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class RegistroNivel extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservatorio_id", nullable = false)
    @ToString.Exclude
    private Reservatorio reservatorio;

    /** Percentual de 0 a 100; nulo quando o usuário informou só a escala qualitativa. */
    @Column(name = "nivel_percentual")
    private Integer nivelPercentual;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EscalaNivel escala;

    @Column(name = "data_registro", nullable = false)
    private LocalDate dataRegistro;

    /** UUID gerado no cliente: idempotência da sincronização (RN13). */
    @Column(name = "id_cliente_sync", unique = true, length = 36)
    private String idClienteSync;

    /** RN10: registro pendente não entra no agregado comunitário. */
    @Column(name = "pendente_sincronizacao", nullable = false)
    private boolean pendenteSincronizacao;

    /** Momento do registro no aparelho; decide conflitos de sincronização (RN02). */
    @Column(name = "registrado_em_cliente")
    private LocalDateTime registradoEmCliente;
}
