package br.com.ifba.cultura.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "cultura")
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Cultura extends PersistenceEntity {

    @Column(nullable = false, unique = true, length = 60)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_criterio", nullable = false, length = 30)
    private TipoCriterio tipoCriterio;

    /** RN09: todo cultivo tem limiar mínimo padrão, com fonte agronômica registrada. */
    @Column(name = "limiar_padrao_mm", nullable = false)
    private Double limiarPadraoMm;

    /** Usado só no critério ACUMULADO_JANELA; nulo = janela padrão configurada. */
    @Column(name = "janela_dias")
    private Integer janelaDias;

    @Column(name = "fonte_limiar", nullable = false, length = 300)
    private String fonteLimiar;
}
