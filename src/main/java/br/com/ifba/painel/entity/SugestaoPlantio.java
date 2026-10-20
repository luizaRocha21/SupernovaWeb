package br.com.ifba.painel.entity;

import br.com.ifba.cultura.entity.Cultura;
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

/** Registro de cada sugestão emitida, para auditoria. */
@Entity
@Table(name = "sugestao_plantio", indexes = @Index(name = "idx_sugestao_usuario", columnList = "usuario_id"))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class SugestaoPlantio extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @ToString.Exclude
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cultura_id", nullable = false)
    @ToString.Exclude
    private Cultura cultura;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NivelSugestao resultado;

    @Column(name = "dado_usado_mm")
    private Double dadoUsadoMm;

    @Column(name = "referencia_mm")
    private Double referenciaMm;

    /** RN16: fonte do dado usado. */
    @Column(name = "fonte_dado", nullable = false, length = 300)
    private String fonteDado;

    /** RN16: data da última atualização do dado usado. */
    @Column(name = "data_dado")
    private LocalDateTime dataDado;

    @Column(name = "grau_confianca", nullable = false)
    private Double grauConfianca;

    @Column(nullable = false, length = 1000)
    private String justificativa;
}
