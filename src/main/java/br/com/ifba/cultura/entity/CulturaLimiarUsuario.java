package br.com.ifba.cultura.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.usuario.entity.Usuario;
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

/** Limiar personalizado do agricultor (RN09): sobrescreve o padrão sem bloqueio. */
@Entity
@Table(name = "cultura_limiar_usuario",
        uniqueConstraints = @UniqueConstraint(name = "uk_limiar_usuario_cultura", columnNames = {"usuario_id", "cultura_id"}))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class CulturaLimiarUsuario extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @ToString.Exclude
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cultura_id", nullable = false)
    @ToString.Exclude
    private Cultura cultura;

    @Column(name = "limiar_mm", nullable = false)
    private Double limiarMm;
}
