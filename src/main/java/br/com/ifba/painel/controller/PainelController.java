package br.com.ifba.painel.controller;

import br.com.ifba.infrastructure.security.UsuarioAutenticado;
import br.com.ifba.painel.dto.PainelDto;
import br.com.ifba.painel.dto.SugestaoDto;
import br.com.ifba.painel.entity.SugestaoPlantio;
import br.com.ifba.painel.service.PainelChuvaIService;
import br.com.ifba.painel.service.SugestaoPlantioIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/localidades")
@RequiredArgsConstructor
public class PainelController {

    private final PainelChuvaIService painelService;
    private final SugestaoPlantioIService sugestaoService;

    /** RF04: núcleo do produto. Resposta leve, cacheável e com ETag (RN13). */
    @GetMapping("/{id}/painel-chuva")
    public ResponseEntity<PainelDto.Painel> painel(@PathVariable Long id,
                                                   @RequestParam(required = false) String cultura,
                                                   @AuthenticationPrincipal UsuarioAutenticado usuario) {
        PainelDto.Painel corpo = painelService.consultar(id, cultura, usuario.id());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePrivate())
                .body(corpo);
    }

    /** RF06: consome o painel e registra a sugestão emitida; por isso não é cacheada. */
    @GetMapping("/{id}/sugestao-plantio")
    public SugestaoDto.Response sugestao(@PathVariable Long id, @RequestParam String cultura,
                                         @AuthenticationPrincipal UsuarioAutenticado usuario) {
        SugestaoPlantio sugestao = sugestaoService.gerar(usuario.id(), id, cultura);
        return SugestaoDto.Response.de(sugestao);
    }
}
