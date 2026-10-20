package br.com.ifba.alerta.entity;

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

import java.time.LocalDateTime;

@Entity
@Table(name = "alerta", indexes = @Index(name = "idx_alerta_localidade_vigencia",
        columnList = "localidade_id, vigencia_inicio, vigencia_fim"))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Alerta extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "emitido_por_id", nullable = false)
    @ToString.Exclude
    private Usuario emitidoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoAlerta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Severidade severidade;

    @Column(nullable = false, length = 300)
    private String mensagem;

    @Column(name = "vigencia_inicio", nullable = false)
    private LocalDateTime vigenciaInicio;

    @Column(name = "vigencia_fim", nullable = false)
    private LocalDateTime vigenciaFim;
}
