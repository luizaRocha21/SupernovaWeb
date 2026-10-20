package br.com.ifba.checklist.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.reservatorio.entity.Reservatorio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Checklist sanitário simplificado. Módulo sujeito ao gate de validação (app.features.checklist). */
@Entity
@Table(name = "checklist_sanitario")
@Getter
@Setter
@NoArgsConstructor
@ToString
public class ChecklistSanitario extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservatorio_id", nullable = false)
    @ToString.Exclude
    private Reservatorio reservatorio;

    @Column(name = "calhas_limpas", nullable = false)
    private boolean calhasLimpas;

    @Column(name = "descarte_primeira_chuva", nullable = false)
    private boolean descartePrimeiraChuva;

    public boolean isConforme() {
        return calhasLimpas && descartePrimeiraChuva;
    }
}
