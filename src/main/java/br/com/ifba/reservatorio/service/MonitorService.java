package br.com.ifba.reservatorio.service;

import br.com.ifba.infrastructure.config.MonitorProperties;
import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.reservatorio.dto.MonitorDto;
import br.com.ifba.reservatorio.entity.EscalaNivel;
import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.repository.RegistroNivelRepository;
import br.com.ifba.reservatorio.repository.ReservatorioRepository;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonitorService implements MonitorIService {

    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final ReservatorioRepository reservatorioRepository;
    private final RegistroNivelRepository registroNivelRepository;
    private final MonitorProperties props;

    @Override
    public MonitorDto.Monitor consultar(Long localidadeId, Long usuarioId) {
        Usuario usuario = usuarioService.findById(usuarioId);
        if (!localidadeService.podeAcessar(usuario, localidadeId)) {
            throw new AcessoProibidoException("Você só pode consultar o monitor da sua localidade.");
        }
        List<Long> ids = localidadeService.findIdsComDescendentes(localidadeId);

        // RN15: só exibe o agregado a partir de um número mínimo de responsáveis distintos
        long participantes = reservatorioRepository.contarResponsaveisAgregaveis(ids);
        int minimo = props.minimoParticipantes();
        if (participantes < minimo) {
            log.info("RN15: monitor oculto, participantes={} minimo={} localidadeId={}", participantes, minimo, localidadeId);
            return MonitorDto.Monitor.indisponivel(localidadeId, minimo, participantes);
        }

        // RN10: a consulta só enxerga registros sincronizados (pendenteSincronizacao = false)
        List<RegistroNivel> ultimos = registroNivelRepository.findUltimosAgregaveis(ids);
        Map<EscalaNivel, Long> distribuicao = new EnumMap<>(EscalaNivel.class);
        for (EscalaNivel escala : EscalaNivel.values()) {
            distribuicao.put(escala, 0L);
        }
        ultimos.forEach(r -> distribuicao.merge(r.getEscala(), 1L, Long::sum));

        int total = ultimos.size();
        long baixoOuCritico = distribuicao.get(EscalaNivel.BAIXO) + distribuicao.get(EscalaNivel.CRITICO);
        Double percentual = total > 0 ? Math.round(baixoOuCritico * 1000.0 / total) / 10.0 : null;
        LocalDateTime ultimaSincronizacao = ultimos.stream().map(RegistroNivel::getAtualizadoEm)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);

        return new MonitorDto.Monitor(localidadeId, true, minimo, participantes, null,
                total, distribuicao, percentual, ultimaSincronizacao);
    }
}
