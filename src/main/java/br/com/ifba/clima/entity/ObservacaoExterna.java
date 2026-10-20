package br.com.ifba.clima.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.localidade.entity.Localidade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
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

/** Chuva diária observada por fonte externa (estação, satélite etc.). */
@Entity
@Table(name = "observacao_externa",
        indexes = @Index(name = "idx_observacao_localidade_data", columnList = "localidade_id, data_observacao"),
        uniqueConstraints = @UniqueConstraint(name = "uk_observacao_dia_fonte",
                columnNames = {"localidade_id", "data_observacao", "fonte"}))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class ObservacaoExterna extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @Column(name = "data_observacao", nullable = false)
    private LocalDate dataObservacao;

    @Column(name = "valor_mm", nullable = false)
    private Double valorMm;

    @Column(nullable = false, length = 200)
    private String fonte;

    /** Data de atualização na fonte (RN16). */
    @Column(name = "fonte_atualizada_em", nullable = false)
    private LocalDateTime fonteAtualizadaEm;
}
