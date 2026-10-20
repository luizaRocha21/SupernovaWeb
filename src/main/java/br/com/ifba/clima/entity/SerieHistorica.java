package br.com.ifba.clima.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.localidade.entity.Localidade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/** Normal climatológica mensal de uma localidade (pré-calculada na ingestão). */
@Entity
@Table(name = "serie_historica",
        uniqueConstraints = @UniqueConstraint(name = "uk_serie_localidade_mes", columnNames = {"localidade_id", "mes"}))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class SerieHistorica extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @Column(nullable = false)
    private Integer mes;

    @Column(name = "normal_mm", nullable = false)
    private Double normalMm;

    /** Quantos anos de dados sustentam a normal (base da regra de suficiência, RN04). */
    @Column(name = "anos_base", nullable = false)
    private Integer anosBase;

    @Column(nullable = false, length = 200)
    private String fonte;

    /** Data de atualização na fonte (RN16). */
    @Column(name = "fonte_atualizada_em", nullable = false)
    private LocalDateTime fonteAtualizadaEm;
}
