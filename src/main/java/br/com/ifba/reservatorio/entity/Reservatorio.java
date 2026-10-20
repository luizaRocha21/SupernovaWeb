package br.com.ifba.reservatorio.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.usuario.entity.Usuario;
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

@Entity
@Table(name = "reservatorio", indexes = {
        @Index(name = "idx_reservatorio_responsavel", columnList = "responsavel_id"),
        @Index(name = "idx_reservatorio_localidade", columnList = "localidade_id")})
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Reservatorio extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsavel_id", nullable = false)
    @ToString.Exclude
    private Usuario responsavel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoReservatorio tipo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @Column(length = 80)
    private String apelido;
}
