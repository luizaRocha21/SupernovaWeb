package br.com.ifba.precipitacao.entity;

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

import java.time.LocalDate;

/** Chuva registrada manualmente pelo usuário. Apenas refina o dado externo (RN04). */
@Entity
@Table(name = "precipitacao", indexes = {
        @Index(name = "idx_precipitacao_localidade_data", columnList = "localidade_id, data_evento"),
        @Index(name = "idx_precipitacao_usuario", columnList = "usuario_id")})
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Precipitacao extends PersistenceEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @ToString.Exclude
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    @Column(name = "volume_mm", nullable = false)
    private Double volumeMm;

    @Column(name = "data_evento", nullable = false)
    private LocalDate dataEvento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FontePrecipitacao fonte;

    /** UUID gerado no cliente: garante idempotência na sincronização (RN13). */
    @Column(name = "id_cliente_sync", unique = true, length = 36)
    private String idClienteSync;
}
