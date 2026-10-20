package br.com.ifba.usuario.entity;

import br.com.ifba.infrastructure.entity.PersistenceEntity;
import br.com.ifba.localidade.entity.Localidade;
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
@Table(name = "usuario", indexes = @Index(name = "idx_usuario_localidade", columnList = "localidade_id"))
@Getter
@Setter
@NoArgsConstructor
@ToString
public class Usuario extends PersistenceEntity {

    @Column(nullable = false, length = 120)
    @ToString.Exclude
    private String nome;

    /** Identificador de login. Dado pessoal: nunca registrar em log. */
    @Column(nullable = false, unique = true, length = 20)
    @ToString.Exclude
    private String telefone;

    @Column(name = "senha_hash", nullable = false)
    @ToString.Exclude
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Perfil perfil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Abastecimento abastecimento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localidade_id", nullable = false)
    @ToString.Exclude
    private Localidade localidade;

    /** Consentimento para uso da localização e para participar de agregados comunitários (RN15). */
    @Column(name = "consentimento_localizacao", nullable = false)
    private boolean consentimentoLocalizacao;
}
