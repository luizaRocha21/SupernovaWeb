package br.com.ifba.localidade.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Localidade em dois níveis: município -> povoado (pai). */
@Entity
@Table(name = "localidade", indexes = @Index(name = "idx_localidade_pai", columnList = "pai_id"))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Localidade extends PersistenceEntity {

    @Column(nullable = false, length = 120)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoLocalidade tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pai_id")
    @ToString.Exclude
    private Localidade pai;

    private Double latitude;

    private Double longitude;
}
