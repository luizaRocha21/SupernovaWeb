package br.com.ifba.clima.controller;

import br.com.ifba.clima.dto.IngestaoDto;
import br.com.ifba.clima.service.IngestaoIService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Restrito ao perfil GESTOR_PUBLICO pela SecurityConfig (/api/v1/admin/**). */
@RestController
@RequestMapping("/api/v1/admin/ingestao")
@RequiredArgsConstructor
public class IngestaoController {

    private final IngestaoIService ingestaoService;

    @PostMapping("/localidades/{id}")
    public IngestaoDto.Resultado ingerir(@PathVariable Long id) {
        return ingestaoService.ingerir(id);
    }

    @PostMapping("/todas")
    public List<IngestaoDto.Resultado> ingerirTodas() {
        return ingestaoService.ingerirTodas();
    }
}
