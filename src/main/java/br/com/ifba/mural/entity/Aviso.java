package br.com.ifba.mural.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.localidade.entity.Localidade;
import br.com.ifba.usuario.entity.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Aviso do mural comunitário. Módulo sujeito ao gate de validação (app.features.mural). */
@Entity
@Table(name = "aviso", indexes = @Index(name = "idx_aviso_localidade", columnList = "localidade_id"))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Aviso extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id", nullable = false)
    @ToString.Exclude
    private Usuario autor;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String descricao;
}
