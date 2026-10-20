package br.com.ifba.usuario.dto;

import br.com.ifba.usuario.entity.Abastecimento;
import br.com.ifba.usuario.entity.Perfil;
import br.com.ifba.usuario.entity.Usuario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class UsuarioDto {

    private UsuarioDto() {
    }

    /** Coleta mínima (LGPD): nome, telefone, senha, perfil, abastecimento, localidade e consentimento. */
    public record CadastroRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Pattern(regexp = "\\d{10,13}", message = "informe só números, com DDD") String telefone,
            @NotBlank @Size(min = 6, max = 72) String senha,
            @NotNull Perfil perfil,
            @NotNull Abastecimento abastecimento,
            @NotNull Long localidadeId,
            boolean consentimentoLocalizacao) {

        public Usuario toEntity() {
            Usuario u = new Usuario();
            u.setNome(nome);
            u.setTelefone(telefone);
            u.setPerfil(perfil);
            u.setAbastecimento(abastecimento);
            u.setConsentimentoLocalizacao(consentimentoLocalizacao);
            return u;
        }
    }

    /** Resposta sem telefone nem hash de senha. */
    public record Response(Long id, String nome, Perfil perfil, Abastecimento abastecimento,
                           Long localidadeId, String localidadeNome, boolean consentimentoLocalizacao) {

        public static Response de(Usuario u) {
            return new Response(u.getId(), u.getNome(), u.getPerfil(), u.getAbastecimento(),
                    u.getLocalidade().getId(), u.getLocalidade().getNome(), u.isConsentimentoLocalizacao());
        }
    }
}
